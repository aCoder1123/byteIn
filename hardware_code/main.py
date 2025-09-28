import NFCLIB as nfc
from machine import Pin, SPI
import network, time, ujson, urequests, neopixel

# ---------------- CONFIG ----------------
SPI_ID = 1
SCK_PIN = 10
MOSI_PIN = 11
MISO_PIN = 12
CS_PIN = 13
RST_PIN = 14

BTN_PIN = 4

NUM_PIXELS = 12
NEO_PIN = 0

SSID = "Wifi SSID Name"
PASSWORD = "Wifi Password"
URL = "API URL"
SPECIAL_UID_HEX = "SPECIAL HEX THAT NEEDS TO BE WRITTEN"

AUTH_TOKEN = "hackGT-12"
TABLE_ID = 101

POLL_MS = 50
REMOVAL_DEBOUNCE_MS = 3000

# ---------------- PN532 INIT ----------------
rst = Pin(RST_PIN, Pin.OUT)
rst.value(0)
time.sleep(0.05)
rst.value(1)
time.sleep(0.3)

spi = SPI(SPI_ID, baudrate=400000, sck=Pin(SCK_PIN), mosi=Pin(MOSI_PIN), miso=Pin(MISO_PIN))
cs = Pin(CS_PIN, Pin.OUT)
cs.on()

pn532 = nfc.PN532(spi, cs)
try:
    ic, ver, rev, support = pn532.get_firmware_version()
    print("PN532 firmware:", ver, rev)
except Exception as e:
    print("PN532 init warning:", e)

pn532.SAM_configuration()

# ---------------- NEOPIXEL INIT ----------------
np = neopixel.NeoPixel(Pin(NEO_PIN), NUM_PIXELS)
led_state = [(0,0,0)] * NUM_PIXELS  # track current LED colors

# ---------------- BUTTON INIT ----------------
btn = Pin(BTN_PIN, Pin.IN, Pin.PULL_DOWN)

# ---------------- STATE ----------------
wifi_connected = False
card_present = False
last_uid = None
last_seen_ms = None
post_queue = []

btn_last_state = 0
btn_down_time = None

# Check-in session
session_active = False
session_start_time = None
session_duration_ms = 0
session_step_ms = 0
current_step = 0
yellow_override = False  # short press override
blink_interval = 500     # blinking LED interval in ms

last_nfc_time = 0

# ---------------- HELPERS ----------------
def uid_to_hex(uid_bytes):
    return "".join("{:02X}".format(b) for b in uid_bytes)

def write_leds_if_changed(colors):
    global led_state
    changed = False
    for i in range(NUM_PIXELS):
        if led_state[i] != colors[i]:
            led_state[i] = colors[i]
            changed = True
    if changed:
        for i, c in enumerate(colors):
            np[i] = c
        np.write()

def set_all_color(color):
    write_leds_if_changed([color]*NUM_PIXELS)

def clear_all():
    set_all_color((0,0,0))

def connect_wifi(ssid, password, timeout_s=20):
    global wifi_connected
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        wifi_connected = True
        return True
    wlan.connect(ssid, password)
    print("Connecting Wi-Fi...")
    t = timeout_s * 2
    while t > 0:
        if wlan.isconnected():
            wifi_connected = True
            print("Connected:", wlan.ifconfig())
            return True
        time.sleep(0.5)
        t -= 1
    wifi_connected = False
    return False

def enqueue_post(uid):
    post_queue.append(uid)

# ---------------- POST PROCESSING ----------------
def process_post_queue():
    global session_active, session_start_time, session_duration_ms, session_step_ms
    global yellow_override

    if not wifi_connected:
        return
    while post_queue:
        uid = post_queue.pop(0)
        hex_uid = uid if isinstance(uid, str) else uid_to_hex(uid)
        body = {'auth': AUTH_TOKEN, 'table': str(TABLE_ID), 'uid': hex_uid}
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        
        resp = None
        try:
            payload = ujson.dumps(body)
            print("Sending POST data:", payload)
            resp = urequests.post(URL, data=payload, headers=headers, timeout=10)

            # Always print response
            try:
                result_text = resp.text
            except:
                result_text = "<could not read text>"
            print("POST response:", result_text)

            if resp.status_code >= 200 and resp.status_code < 300:
                result = resp.json()
                if result.get("delay", -1) < 0:
                    return

                if result.get("checkedIn", False):
                    # Start or refresh session
                    session_active = True
                    session_start_time = time.ticks_ms()
                    session_duration_ms = result["delay"] * 60 * 1000
                    session_step_ms = session_duration_ms // NUM_PIXELS
                    yellow_override = False
                    set_all_color((255,0,0))  # solid red on check-in
                else:
                    # Checked out
                    session_active = False
                    clear_all()
                    yellow_override = False
            else:
                print(f"POST Error! Status Code: {resp.status_code}")

        except Exception as e:
            print("POST failed with exception:", e)
        finally:
            if resp:
                resp.close()

# ---------------- SESSION / LED UPDATE ----------------
def update_session(now):
    global current_step, session_active, yellow_override

    if not session_active:
        return False

    elapsed = time.ticks_diff(now, session_start_time)
    if elapsed >= session_duration_ms:
        enqueue_post("-")
        session_active = False
        clear_all()
        yellow_override = False
        return False

    # Determine blinking threshold: last 5 min or 10% of session
    last_5min_ms = 5*60*1000
    last_10pct_ms = session_duration_ms // 10
    blink_threshold = min(last_5min_ms, last_10pct_ms)

    time_left = session_duration_ms - elapsed
    blinking = time_left <= blink_threshold

    colors = []
    for i in range(NUM_PIXELS):
        if yellow_override:
            color = (255,255,0)  # yellow override takes precedence
        elif blinking:
            color = (255,0,0) if (elapsed//blink_interval)%2==0 else (0,0,0)
        else:
            color = (255,0,0)  # solid red
        colors.append(color)

    write_leds_if_changed(colors)
    return True

# ---------------- MAIN LOOP ----------------
print("Disconnecting Wi-Fi at start...")
wlan = network.WLAN(network.STA_IF)
wlan.active(False)

print("Ready. Tap card to POST UID. Short press -> yellow override. Long press -> cancel.")

while True:
    now = time.ticks_ms()

    # ---------------- NFC POLL ----------------
    uid = pn532.read_passive_target(timeout=200)
    if uid:
        if time.ticks_diff(now, last_nfc_time) > 1500:
            hexstr = uid_to_hex(uid)
            print("Tap event:", hexstr)
            last_uid = uid
            last_seen_ms = now
            card_present = True
            last_nfc_time = now

            # Visual feedback: flash cyan briefly
            write_leds_if_changed([(0,255,255)]*NUM_PIXELS)
            time.sleep_ms(200)  # short feedback

            if hexstr.upper() == SPECIAL_UID_HEX.upper() and not wifi_connected:
                connect_wifi(SSID, PASSWORD)
                if wifi_connected:
                    set_all_color((0,255,0))
            elif wifi_connected:
                enqueue_post(uid)
                # Do NOT reset to green here; session will manage colors

    elif card_present and last_seen_ms:
        if time.ticks_diff(now, last_seen_ms) >= REMOVAL_DEBOUNCE_MS:
            card_present = False
            last_uid = None
            last_seen_ms = None

    # ---------------- BUTTON ----------------
    btn_state = btn.value()
    if btn_state == 1 and btn_last_state == 0:
        btn_down_time = now
    elif btn_state == 0 and btn_last_state == 1:
        held = time.ticks_diff(now, btn_down_time or now)
        if held >= 1000:  # long press threshold
            if session_active:
                enqueue_post("-")  # cancel POST
                session_active = False
                yellow_override = False
                print("Button long press -> cancel session")
                # Force LEDs back to idle green
                led_state[:] = [(0,0,0)] * NUM_PIXELS
                set_all_color((0,255,0))
        else:
            if session_active:
                yellow_override = not yellow_override
                print("Button short press -> yellow override")
                # Update LEDs immediately to reflect yellow override
                update_session(now)
                time.sleep_ms(100)  # allow time for NeoPixels
        btn_down_time = None
    btn_last_state = btn_state

    # ---------------- POST QUEUE ----------------
    process_post_queue()

    # ---------------- LED STATE ----------------
    if not wifi_connected:
        set_all_color((0,0,255))  # Blue
    elif session_active:
        if not update_session(now):
            set_all_color((0,255,0))  # session ended -> green
            yellow_override = False
    else:
        set_all_color((0,255,0))  # idle green

    time.sleep_ms(POLL_MS)


