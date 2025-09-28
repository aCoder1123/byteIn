// Table Management System JavaScript

class TableManager {
    constructor() {
        this.floors = {
            1: this.generateFloorData(1),
            2: this.generateFloorData(2),
            3: this.generateFloorData(3)
        };
        this.currentFloor = 1;
        this.selectedTable = null;
        this.isAdminMode = false;
        this.isMapGeneratorMode = false;
        
        // Map generator properties
        this.currentMapImage = null;
        this.mapComponents = [];
        this.selectedComponent = null;
        this.currentTool = 'add'; // Default tool is 'add'
        this.componentCounter = 1;
        
        // Authentication properties
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Real-time listener properties
        this.mapsListener = null;
        this.mapComponentsListener = null; // For listening to current map's components
        this.currentMaps = new Map(); // Store current maps data for comparison
        this.currentMapComponents = new Map(); // Store current map components for comparison
        
        this.init();
        this.loadFirebaseMaps();
        this.initAuth();
    }

    // Generate sample floor data with some occupied tables
    generateFloorData(floorNumber) {
        const tables = [];
        const tableCount = 18; // 6x3 grid
        
        for (let i = 1; i <= tableCount; i++) {
            // Randomly assign some tables as occupied
            const isOccupied = Math.random() < 0.3; // 30% chance of being occupied
            
            tables.push({
                id: i,
                floor: floorNumber,
                occupied: isOccupied,
                assignedTo: isOccupied ? `Guest ${Math.floor(Math.random() * 100) + 1}` : null
            });
        }
        
        return tables;
    }

    init() {
        this.setupEventListeners();
        this.renderDashboard();
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('dashboard-btn').addEventListener('click', () => {
            this.switchToDashboard();
        });

        document.getElementById('maps-btn').addEventListener('click', () => {
            this.switchToMapsOverview();
        });

        document.getElementById('admin-btn').addEventListener('click', () => {
            if (this.isAuthenticated) {
                this.switchToAdmin();
            } else {
                this.showNotification('Please log in to access Map Generator', 'error');
            }
        });

        // Authentication buttons
        document.getElementById('login-btn').addEventListener('click', () => {
            window.location.href = './signIn.html';
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.signOut();
        });

        // Floor selection for dashboard
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const floor = parseInt(e.target.dataset.floor);
                this.switchFloor(floor);
            });
        });

        // Admin control buttons - removed since we now use direct click-to-assign workflow

        // Map generator mode buttons - table management removed

        // Map generator is now the default admin view

        // Image upload
        document.getElementById('map-image-input').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });

        document.getElementById('upload-area').addEventListener('click', () => {
            document.getElementById('map-image-input').click();
        });

        // Drag and drop for image upload
        const uploadArea = document.getElementById('upload-area');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.currentTarget.dataset.type);
            });
        });

        // Map canvas click
        document.getElementById('map-canvas').addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });

        // Component properties
        document.getElementById('save-component-btn').addEventListener('click', () => {
            this.saveComponentProperties();
        });


        // Map actions

        document.getElementById('reset-map-btn').addEventListener('click', () => {
            this.resetMap();
        });

        document.getElementById('sync-map-btn').addEventListener('click', () => {
            this.syncMapWithTables();
        });

        // Download/Upload functionality
        document.getElementById('download-map-btn').addEventListener('click', () => {
            this.downloadMap();
        });

        // Firebase Save button
        document.getElementById('save-map-firebase-btn').addEventListener('click', () => {
            this.saveMapToFirebase();
        });

        // Test Firebase connection button (temporary for debugging)
        if (document.getElementById('test-firebase-btn')) {
            document.getElementById('test-firebase-btn').addEventListener('click', () => {
                this.testFirebaseConnection();
            });
        }

        // Floor number input
        document.getElementById('floor-number-input').addEventListener('input', (e) => {
            this.currentFloor = parseInt(e.target.value) || 1;
            this.updateFloorDisplay();
        });

        // Map selector functionality
        document.getElementById('load-selected-map-btn').addEventListener('click', () => {
            this.loadSelectedFirebaseMap();
        });

        document.getElementById('refresh-maps-btn').addEventListener('click', () => {
            this.loadFirebaseMaps();
        });

        // Maps overview controls
        document.getElementById('refresh-maps-overview-btn').addEventListener('click', () => {
            // Clear current maps data and reload
            this.currentMaps.clear();
            this.loadMapsOverview();
        });

        document.getElementById('create-new-map-btn').addEventListener('click', () => {
            if (this.isAuthenticated) {
                this.switchToAdmin();
            } else {
                this.showNotification('Please log in to create new maps', 'error');
            }
        });

        document.getElementById('map-select').addEventListener('change', (e) => {
            const loadBtn = document.getElementById('load-selected-map-btn');
            loadBtn.disabled = !e.target.value;
        });

        document.getElementById('map-file-input').addEventListener('change', (e) => {
            this.uploadMapFile(e.target.files[0]);
        });

        // Fullscreen functionality
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // NFC Writer Modal functionality
        this.setupNFCModal();
    }

    switchToDashboard() {
        document.getElementById('dashboard-screen').classList.add('active');
        document.getElementById('maps-screen').classList.remove('active');
        document.getElementById('admin-screen').classList.remove('active');
        document.getElementById('dashboard-btn').classList.add('active');
        document.getElementById('maps-btn').classList.remove('active');
        document.getElementById('admin-btn').classList.remove('active');
        this.isAdminMode = false;
        
        // Clean up maps listener and set up table data listeners
        this.cleanupMapsListener();
        this.renderDashboard();
    }

    switchToMapsOverview() {
        document.getElementById('dashboard-screen').classList.remove('active');
        document.getElementById('maps-screen').classList.add('active');
        document.getElementById('admin-screen').classList.remove('active');
        document.getElementById('dashboard-btn').classList.remove('active');
        document.getElementById('maps-btn').classList.add('active');
        document.getElementById('admin-btn').classList.remove('active');
        this.isAdminMode = false;
        
        // Clean up table data listeners and set up maps real-time listener
        this.cleanupMapComponentsListener();
        this.setupMapsListener();
        this.loadMapsOverview();
    }

    switchToAdmin() {
        document.getElementById('dashboard-screen').classList.remove('active');
        document.getElementById('maps-screen').classList.remove('active');
        document.getElementById('admin-screen').classList.add('active');
        document.getElementById('dashboard-btn').classList.remove('active');
        document.getElementById('maps-btn').classList.remove('active');
        document.getElementById('admin-btn').classList.add('active');
        this.isAdminMode = true;
        
        // Clean up all real-time listeners when switching to admin
        this.cleanupMapComponentsListener();
        this.cleanupMapsListener();
        
        this.switchToMapGenerator();
    }


    switchToMapGenerator() {
        this.isMapGeneratorMode = true;
        this.renderMapGenerator();
        this.updateFloorDisplay();
    }

    updateFloorDisplay() {
        const floorInput = document.getElementById('floor-number-input');
        if (floorInput) {
            floorInput.value = this.currentFloor;
        }
    }

    async testFirebaseConnection() {
        console.log('Testing Firebase connection...');
        try {
            if (!window.firebaseDB) {
                console.error('Firebase DB not available');
                this.showNotification('Firebase DB not available', 'error');
                return;
            }

            console.log('Firebase DB:', window.firebaseDB);
            console.log('Available Firebase functions:', {
                firebaseCollection: typeof window.firebaseCollection,
                firebaseSetDoc: typeof window.firebaseSetDoc,
                firebaseDoc: typeof window.firebaseDoc,
                firebaseGetDocs: typeof window.firebaseGetDocs
            });

            // Try to create a simple test document
            const testData = { 
                test: true, 
                timestamp: new Date().toISOString(),
                message: 'Firebase connection test'
            };
            
            const testCollection = window.firebaseCollection(window.firebaseDB, 'test');
            const testDocRef = window.firebaseDoc(testCollection, 'connection-test');
            
            console.log('Test collection:', testCollection);
            console.log('Test doc ref:', testDocRef);
            
            await window.firebaseSetDoc(testDocRef, testData);
            console.log('Test document saved successfully!');
            
            this.showNotification('Firebase connection test successful!', 'success');
        } catch (error) {
            console.error('Firebase connection test failed:', error);
            this.showNotification('Firebase connection test failed: ' + error.message, 'error');
        }
    }

    switchFloor(floorNumber) {
        this.currentFloor = floorNumber;
        
        // Clean up existing listeners before switching floors
        this.cleanupMapComponentsListener();
        
        // Update dashboard floor buttons
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.floor) === floorNumber) {
                btn.classList.add('active');
            }
        });

        // Update floor title
        document.getElementById('current-floor-title').textContent = `Floor ${floorNumber}`;

        // Re-render current view
        if (this.isAdminMode) {
            // Admin mode - do nothing for now
        } else {
            this.renderDashboard();
        }
    }


    async renderDashboard() {
        const mapContainer = document.getElementById('table-map');
        mapContainer.innerHTML = '<div class="loading-placeholder">Loading map...</div>';
        
        try {
            // Get the map for this floor
            const mapData = await this.getMapForFloor(this.currentFloor);
            
            if (mapData) {
                // Display the map with components
                this.displayDashboardMap(mapData);
                // Set up real-time listener for map components (occupancy changes)
                this.setupMapComponentsListener();
            } else {
                // No map found for this floor
                mapContainer.innerHTML = `
                    <div class="no-map-placeholder">
                        <h3>No Map Available</h3>
                        <p>No map has been created for Floor ${this.currentFloor} yet.</p>
                        <p>Use the Map Generator to create a map for this floor.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading dashboard map:', error);
            mapContainer.innerHTML = `
                <div class="error-placeholder">
                    <h3>Error Loading Map</h3>
                    <p>Unable to load the map for Floor ${this.currentFloor}.</p>
                    <p>Please check your Firebase connection.</p>
                </div>
            `;
        }
    }

    displayDashboardMap(mapData) {
        const mapContainer = document.getElementById('table-map');
        mapContainer.innerHTML = '';
        mapContainer.className = 'table-map dashboard-map-view';

        // Create a wrapper for the image and components
        const mapWrapper = document.createElement('div');
        mapWrapper.style.position = 'relative';
        mapWrapper.style.display = 'inline-block';
        mapContainer.appendChild(mapWrapper);

        // Display the map image with responsive sizing
        const img = document.createElement('img');
        img.src = mapData.image;
        img.style.display = 'block';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '70vh';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        
        // Store reference to the image for scaling calculations
        this.dashboardImage = img;
        
        // Ensure image loads properly
        img.onload = () => {
            // Render components after image loads with proper scaling
            this.renderDashboardComponents(mapWrapper, mapData.components, img, mapData);
        };
        
        mapWrapper.appendChild(img);
    }

    renderDashboardComponents(container, components, img, mapData) {
        if (!components || components.length === 0) return;

        // Initialize current map components for real-time tracking
        this.currentMapComponents.clear();
        components.forEach(component => {
            this.currentMapComponents.set(component.id.toString(), component);
        });

        // Get the actual displayed dimensions of the image on screen (after responsive sizing)
        const currentDisplayedWidth = img.offsetWidth;
        const currentDisplayedHeight = img.offsetHeight;
        

        components
            .filter(component => component.type === 'table' || component.type === 'add')
            .forEach(component => {
                const tableElement = document.createElement('div');
                tableElement.className = 'dashboard-table-component';
                tableElement.style.position = 'absolute';
                
                // Convert normalized coordinates (0-1) to pixel positions
                const pixelX = component.x * currentDisplayedWidth;
                const pixelY = component.y * currentDisplayedHeight;
                
                tableElement.style.left = `${pixelX}px`;
                tableElement.style.top = `${pixelY}px`;
                
                // Scale the component size proportionally based on image size
                const baseSize = 24;
                const scaleFactor = Math.min(currentDisplayedWidth / 800, currentDisplayedHeight / 600);
                const scaledSize = Math.max(12, Math.min(40, baseSize * scaleFactor));
                tableElement.style.width = `${scaledSize}px`;
                tableElement.style.height = `${scaledSize}px`;
                
                tableElement.style.borderRadius = '50%';
                tableElement.style.display = 'flex';
                tableElement.style.alignItems = 'center';
                tableElement.style.justifyContent = 'center';
                tableElement.style.color = 'white';
                tableElement.style.fontWeight = 'bold';
                tableElement.style.fontSize = `${Math.max(0.7, scaledSize * 0.025)}rem`;
                tableElement.style.cursor = 'default';
                tableElement.style.zIndex = '10';
                tableElement.style.transform = 'translate(-50%, -50%)';
                // Add smooth transition for status changes
                tableElement.style.transition = 'background-color 0.3s ease, border-color 0.3s ease';


                // Add table number and data attribute for easier selection
                const tableNumber = document.createElement('div');
                tableNumber.textContent = component.id || '?';
                tableElement.appendChild(tableNumber);
                
                // Add data attribute for easier table selection
                const tableIdString = component.id.toString();
                tableElement.setAttribute('data-table-id', tableIdString);
                
                // Set initial visual state based on occupancy
                this.updateTableElement(tableElement, component.occupied);
                
                // Add hover effect (view only)
                tableElement.addEventListener('mouseenter', () => {
                    tableElement.style.transform = 'translate(-50%, -50%) scale(1.1)';
                    tableElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                    tableElement.style.zIndex = '20';
                });

                tableElement.addEventListener('mouseleave', () => {
                    tableElement.style.transform = 'translate(-50%, -50%) scale(1)';
                    tableElement.style.boxShadow = 'none';
                    tableElement.style.zIndex = '10';
                });

                container.appendChild(tableElement);
            });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        let backgroundColor = '#3498db'; // Default info
        if(type === 'success') backgroundColor = '#27ae60';
        if(type === 'error') backgroundColor = '#e74c3c';
        if(type === 'warning') backgroundColor = '#f39c12';


        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${backgroundColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Method to get current floor data (useful for external access)
    getFloorData(floorNumber = this.currentFloor) {
        return this.floors[floorNumber];
    }

    // Method to manually set table status (useful for external integrations)
    setTableStatus(floorNumber, tableNumber, occupied, assignedTo = null) {
        const tableId = `${floorNumber}-${tableNumber}`;
        const table = this.floors[floorNumber].find(t => t.id === tableId);
        
        if (table) {
            table.occupied = occupied;
            table.assignedTo = assignedTo;
            
            // Re-render current view if it's the active floor
            if (this.currentFloor === floorNumber) {
                if (this.isAdminMode) {
                } else {
                    this.renderDashboard();
                }
            }
        }
    }

    // Map Generator Methods
    renderMapGenerator() {
        // Load saved map data for current floor if available
        this.loadFloorMapData();
    }

    handleImageUpload(file) {
        if (!file) {
            this.showNotification('No file selected', 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }

        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File size too large. Please select an image smaller than 10MB', 'error');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.currentMapImage = e.target.result;
            this.displayMapImage();
            this.showNotification('Image uploaded successfully', 'success');
        };
        
        reader.onerror = (e) => {
            this.showNotification('Error reading file', 'error');
        };
        
        reader.readAsDataURL(file);
    }

    displayMapImage(clearComponents = true) {
        const canvas = document.getElementById('map-canvas');
        canvas.innerHTML = '';

        const img = document.createElement('img');
        img.src = this.currentMapImage;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        
        // Ensure image loads properly
        img.onload = () => {
            // Re-render components after image loads
            this.renderMapComponents();
        };
        
        canvas.appendChild(img);

        // Only clear existing components when explicitly requested (e.g., new upload)
        if (clearComponents) {
            this.mapComponents = [];
            this.componentCounter = 1;
            this.selectedComponent = null;
            this.updateComponentProperties();
        }
    }

    selectTool(toolType) {
        this.currentTool = toolType;
        
        // Update tool button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${toolType}"]`).classList.add('active');

        // Clear selection when switching tools
        this.selectedComponent = null;
        this.updateComponentProperties();
        this.updateComponentSelection();
        
        // Update component cursor style based on tool
        this.updateComponentCursorStyle();
    }

    updateComponentCursorStyle() {
        const components = document.querySelectorAll('.map-component');
        components.forEach(component => {
            if (this.currentTool === 'assign') {
                component.style.cursor = 'pointer';
                component.title = 'Click to assign NFC tag';
            } else {
                component.style.cursor = 'default';
                component.title = component.title.replace('Click to assign NFC tag', '').trim();
            }
        });
    }

    handleCanvasClick(e) {
        if (this.currentTool === 'assign') {
            this.showNotification('Click on a table to assign it, not the map.', 'info');
            return;
        }
        
        if (this.currentTool === 'select') {
            return; // Selection is handled by component clicks
        }

        if (!this.currentMapImage) {
            this.showNotification('Please upload an image first', 'error');
            return;
        }

        const canvas = document.getElementById('map-canvas');
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Get the actual image element to calculate its position within the canvas
        const img = canvas.querySelector('img');
        if (!img) return;

        // Calculate image position within the canvas (centered with object-fit: contain)
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        const imgWidth = img.offsetWidth;
        const imgHeight = img.offsetHeight;
        
        // Image is centered, so calculate the offset
        const imageOffsetX = (canvasWidth - imgWidth) / 2;
        const imageOffsetY = (canvasHeight - imgHeight) / 2;
        
        // Convert canvas coordinates to image-relative coordinates
        const imageX = canvasX - imageOffsetX;
        const imageY = canvasY - imageOffsetY;
        
        // Normalize coordinates to be between 0 and 1
        const normX = imageX / imgWidth;
        const normY = imageY / imgHeight;
        
        // Ignore clicks outside the image bounds
        if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
            return;
        }

        this.createComponent(normX, normY);
    }

    createComponent(x, y) {
        const componentType = 'table';
        const componentNumber = this.componentCounter;

        const component = {
            type: componentType,
            id: componentNumber,
            x: x,
            y: y,
            occupied: false,
            assignedTo: null
        };

        this.mapComponents.push(component);
        this.renderMapComponents();
        this.selectedComponent = component;
        this.updateComponentProperties();
        this.updateComponentSelection();
        
        // Auto-save to Firebase if we have a current map loaded from Firebase
        this.autoSaveToFirebase();
    }

    renderMapComponents() {
        // Remove existing component elements
        document.querySelectorAll('.map-component').forEach(el => el.remove());

        const canvas = document.getElementById('map-canvas');
        const img = canvas.querySelector('img');
        
        if (!img) return;
        
        // Calculate image position within the canvas
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        const imgWidth = img.offsetWidth;
        const imgHeight = img.offsetHeight;
        
        // Image is centered, so calculate the offset
        const imageOffsetX = (canvasWidth - imgWidth) / 2;
        const imageOffsetY = (canvasHeight - imgHeight) / 2;
        
        this.mapComponents.forEach(component => {
            const element = document.createElement('div');
            element.className = 'map-component';
            element.dataset.componentId = component.id;
            
            // Position component relative to canvas, accounting for image offset
            const pixelX = (component.x * imgWidth) + imageOffsetX;
            const pixelY = (component.y * imgHeight) + imageOffsetY;
            
            element.style.left = `${pixelX}px`;
            element.style.top = `${pixelY}px`;

            if (component.occupied) {
                element.classList.add('occupied');
            }
            
            element.textContent = component.id || '?';
            element.title = `Table ${component.id}`;
            
            // Create delete X button
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'component-delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete component';
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.mapComponents = this.mapComponents.filter(c => c.id !== component.id);
                this.selectedComponent = null;
                this.renderMapComponents();
                this.updateComponentProperties();
                this.showNotification('Component deleted', 'success');
                
                // Auto-save to Firebase if we have a current map loaded from Firebase
                this.autoSaveToFirebase();
            });
            
            element.appendChild(deleteBtn);
            
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Check if we're in assign mode
                if (this.currentTool === 'assign') {
                    this.openNFCWriterModal(component);
                } else {
                    this.selectComponent(component);
                }
            });

            canvas.appendChild(element);
        });
        
        // Update cursor styles based on current tool
        this.updateComponentCursorStyle();
    }

    selectComponent(component) {
        this.selectedComponent = component;
        this.updateComponentProperties();
        this.updateComponentSelection();
    }

    updateComponentSelection() {
        document.querySelectorAll('.map-component').forEach(el => {
            el.classList.remove('selected');
        });

        if (this.selectedComponent) {
            const element = document.querySelector(`[data-component-id="${this.selectedComponent.id}"]`);
            if (element) {
                element.classList.add('selected');
            }
        }
    }

    updateComponentProperties() {
        const propertiesDiv = document.getElementById('component-properties');
        
        if (this.selectedComponent) {
            propertiesDiv.style.display = 'block';
            
            const numberInput = document.getElementById('component-number');
            
            if (numberInput) {
                numberInput.value = this.selectedComponent.id || '';
            }
        } else {
            propertiesDiv.style.display = 'none';
        }
    }

    saveComponentProperties() {
        if (!this.selectedComponent) return;

        const numberInput = document.getElementById('component-number');
        
        if (!numberInput) {
            this.showNotification('Component properties form not found', 'error');
            return;
        }

        const number = parseInt(numberInput.value) || 1;

        if (!number) {
            this.showNotification('Please enter a table number', 'error');
            return;
        }

        this.selectedComponent.id = number;
        // Keep the existing type (since we removed the type selector)

        this.renderMapComponents();
        this.updateComponentSelection();
        this.showNotification('Component properties saved', 'success');
        
        // Auto-save to Firebase if we have a current map loaded from Firebase
        this.autoSaveToFirebase();
    }

    deleteSelectedComponent() {
        if (!this.selectedComponent) return;

        this.mapComponents = this.mapComponents.filter(c => c.id !== this.selectedComponent.id);
        this.selectedComponent = null;
        this.renderMapComponents();
        this.updateComponentProperties();
        
        // Auto-save to Firebase if we have a current map loaded from Firebase
        this.autoSaveToFirebase();
    }

    resetMap() {
        if (confirm('Are you sure you want to reset the map? This will delete all components and the uploaded image.')) {
            this.currentMapImage = null;
            this.mapComponents = [];
            this.componentCounter = 1;
            this.selectedComponent = null;
            this.currentFirebaseMapId = null; // Clear Firebase tracking

            const canvas = document.getElementById('map-canvas');
            canvas.innerHTML = '<div class="canvas-placeholder"><p>Upload an image to start creating your map</p></div>';
            
            this.updateComponentProperties();
            this.showNotification('Map reset', 'success');
        }
    }

    loadFloorMapData() {
        const key = `floor-map-${this.currentFloor}`;
        const savedData = localStorage.getItem(key);
        
        if (savedData) {
            const mapData = JSON.parse(savedData);
            this.currentMapImage = mapData.image;
            this.mapComponents = mapData.components || [];
            this.componentCounter = mapData.componentCounter || 1;
            this.selectedComponent = null;

            if (this.currentMapImage) {
                this.displayMapImage(false); // don't clear components when loading
            }
            
            this.renderMapComponents();
            this.updateComponentProperties();
        }
    }

    // Convert map components to table data for integration with existing system
    convertMapToTableData() {
        const tables = [];
        
        this.mapComponents
            .filter(component => component.type === 'table')
            .forEach(component => {
                // Use the component id directly as table number
                let tableNumber = component.id || 1;
                
                tables.push({
                    id: tableNumber,
                    floor: this.currentFloor,
                    occupied: component.occupied || false,
                    assignedTo: component.assignedTo || null,
                    x: component.x,
                    y: component.y,
                    capacity: 2,
                    // Mark as custom map table
                    isCustomMap: true,
                    originalComponentId: component.id
                });
            });

        return tables;
    }

    // Update floor data with map components
    updateFloorWithMapData() {
        if (this.mapComponents.length === 0) return;

        const mapTables = this.convertMapToTableData();
        if (mapTables.length > 0) {
            this.floors[this.currentFloor] = mapTables;
            
            // Re-render current views
            if (this.isAdminMode && !this.isMapGeneratorMode) {
            } else if (!this.isAdminMode) {
                this.renderDashboard();
            }
        }
    }

    syncMapWithTables() {
        if (this.mapComponents.length === 0) {
            this.showNotification('No map components to sync', 'error');
            return;
        }

        const tableComponents = this.mapComponents.filter(c => c.type === 'table' || c.type === 'add');
        if (tableComponents.length === 0) {
            this.showNotification('No table components found in the map', 'error');
            return;
        }

        const tableCount = tableComponents.length;
        const currentTableCount = this.floors[this.currentFloor].length;
        
        if (confirm(`This will replace the current ${currentTableCount} tables on Floor ${this.currentFloor} with ${tableCount} tables from your custom map. All table numbers will be clickable for assignment. Continue?`)) {
            this.updateFloorWithMapData();
            this.showNotification(`Floor ${this.currentFloor} updated with ${tableCount} custom tables. All tables are clickable for assignment!`, 'success');
            
            // Map synced successfully
        }
    }

    toggleFullscreen() {
        const canvasContainer = document.getElementById('map-canvas-container');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const fullscreenIcon = fullscreenBtn.querySelector('.fullscreen-icon');
        
        if (canvasContainer.classList.contains('fullscreen')) {
            // Exit fullscreen
            canvasContainer.classList.remove('fullscreen');
            fullscreenIcon.textContent = '⛶';
            document.body.style.overflow = '';
        } else {
            // Enter fullscreen
            canvasContainer.classList.add('fullscreen');
            fullscreenIcon.textContent = '✕';
            document.body.style.overflow = 'hidden';
        }
        
        // We need to re-render components after a short delay to allow the CSS transition to complete
        // and get the new correct dimensions of the image.
        setTimeout(() => this.renderMapComponents(), 100);
    }

    downloadMap() {
        if (!this.currentMapImage && this.mapComponents.length === 0) {
            this.showNotification('No map data to download', 'error');
            return;
        }

        const mapData = {
            version: '1.0',
            floor: this.currentFloor,
            timestamp: new Date().toISOString(),
            image: this.currentMapImage,
            components: this.mapComponents,
            componentCounter: this.componentCounter,
            metadata: {
                totalComponents: this.mapComponents.length,
                tableComponents: this.mapComponents.filter(c => c.type === 'table').length,
                createdBy: 'Table Management System'
            }
        };

        // Create filename with floor and timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `floor-${this.currentFloor}-map-${timestamp}.json`;

        // Create and download the file
        const dataStr = JSON.stringify(mapData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
        this.showNotification(`Map downloaded as ${filename}`, 'success');
    }

    uploadMapFile(file) {
        if (!file) {
            this.showNotification('No file selected', 'error');
            return;
        }

        if (!file.name.endsWith('.json')) {
            this.showNotification('Please select a valid JSON map file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const mapData = JSON.parse(e.target.result);
                
                // Validate the map data structure
                if (!this.validateMapData(mapData)) {
                    this.showNotification('Invalid map file format', 'error');
                    return;
                }

                // Load the map data
                this.loadMapData(mapData);
                this.showNotification('Map file uploaded successfully', 'success');
                
            } catch (error) {
                this.showNotification('Error reading map file. Please check the file format.', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    validateMapData(data) {
        // Basic validation of map data structure
        return (
            data &&
            typeof data.floor === 'number' &&
            Array.isArray(data.components) &&
            typeof data.componentCounter === 'number'
        );
    }

    loadMapData(mapData) {
        // Update current floor if different
        if (mapData.floor !== this.currentFloor) {
            this.currentFloor = mapData.floor;
        }

        // Load map data
        this.currentMapImage = mapData.image;
        this.mapComponents = mapData.components || [];
        this.componentCounter = mapData.componentCounter || 1;
        this.selectedComponent = null;

        // Display the map
        if (this.currentMapImage) {
            this.displayMapImage(false);
        } else {
            this.renderMapComponents();
        }
        
        this.updateComponentProperties();
    }

    // Firebase Methods
    async getMapForFloor(floorNumber) {
        try {
            console.log('Getting map for floor:', floorNumber);
            console.log('Firebase initialized:', window.firebaseInitialized);
            console.log('Firebase DB:', !!window.firebaseDB);
            
            if (!window.firebaseInitialized || !window.firebaseDB) {
                console.log('Firebase not ready, returning null');
                return null;
            }

            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            const docRef = window.firebaseDoc(mapsCollection, floorNumber.toString());
            console.log('Document reference created for floor:', floorNumber);
            
            const docSnapshot = await window.firebaseGetDoc(docRef);
            console.log('Document exists:', docSnapshot.exists());
            
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                console.log('Document data:', data);
                return { id: docSnapshot.id, ...data };
            }
            
            console.log('No document found for floor:', floorNumber);
            return null;
        } catch (error) {
            console.error('Error getting map for floor:', error);
            return null;
        }
    }

    async loadFirebaseMaps() {
        try {
            if (!window.firebaseInitialized || !window.firebaseDB) {
                return;
            }

            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            const querySnapshot = await window.firebaseGetDocs(mapsCollection);
            
            const mapSelect = document.getElementById('map-select');
            mapSelect.innerHTML = '<option value="">Choose existing map...</option>';
            
            querySnapshot.forEach((doc) => {
                const mapData = doc.data();
                const floorNumber = parseInt(doc.id);
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${mapData.name || `Floor ${floorNumber} Map`} (Floor ${floorNumber})`;
                mapSelect.appendChild(option);
            });

            // Show notification if maps were found
            if (querySnapshot.size > 0) {
                this.showNotification(`Loaded ${querySnapshot.size} maps from Firebase`, 'success');
            } else {
                this.showNotification('No maps found in Firebase', 'info');
            }
        } catch (error) {
            console.error('Error loading Firebase maps:', error);
            this.showNotification('Error loading maps from Firebase', 'error');
        }
    }

    async saveMapToFirebase() {
        console.log('saveMapToFirebase called');
        try {
            if (!window.firebaseDB) {
                console.error('Firebase DB not available');
                this.showNotification('Firebase not initialized. Please check your Firebase configuration.', 'error');
                return;
            }

            console.log('Firebase DB available:', window.firebaseDB);
            console.log('User authenticated:', this.isAuthenticated);
            console.log('Current user:', this.currentUser);

            // Get floor number from input field
            const floorInput = document.getElementById('floor-number-input');
            const floorNumber = parseInt(floorInput.value);
            
            console.log('Floor number from input:', floorNumber);
            
            // Validate floor number
            if (!floorNumber || floorNumber < 1 || floorNumber > 99) {
                console.error('Invalid floor number:', floorNumber);
                this.showNotification('Please enter a valid floor number (1-99)', 'error');
                floorInput.focus();
                return;
            }

            // Validate that we have components to save
            if (!this.mapComponents || this.mapComponents.length === 0) {
                console.error('No components to save:', this.mapComponents);
                this.showNotification('Please add at least one table component before saving', 'error');
                return;
            }

            console.log('Components to save:', this.mapComponents);

            // Update current floor to match input
            this.currentFloor = floorNumber;

            const mapData = {
                name: `Floor ${this.currentFloor} Map`,
                image: this.currentMapImage,
                components: this.mapComponents,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            console.log('Map data to save:', mapData);

            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            console.log('Maps collection:', mapsCollection);
            
            const docRef = window.firebaseDoc(mapsCollection, this.currentFloor.toString());
            console.log('Document reference:', docRef);
            
            console.log('Attempting to save to Firebase...');
            
            // Try to save with a test document first
            try {
                const testData = { test: true, timestamp: new Date().toISOString() };
                const testDocRef = window.firebaseDoc(window.firebaseDB, 'test', 'test');
                await window.firebaseSetDoc(testDocRef, testData);
                console.log('Test document saved successfully');
                
                // Now save the actual map data
                await window.firebaseSetDoc(docRef, mapData);
                console.log('Successfully saved to Firebase');
            } catch (saveError) {
                console.error('Save error:', saveError);
                throw saveError;
            }
            
            this.showNotification(`Floor ${this.currentFloor} map saved successfully!`, 'success');
            this.loadFirebaseMaps(); // Refresh the map list
        } catch (error) {
            console.error('Error saving map to Firebase:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            this.showNotification('Error saving map to Firebase: ' + error.message, 'error');
        }
    }

    async loadSelectedFirebaseMap() {
        try {
            const mapSelect = document.getElementById('map-select');
            const selectedMapId = mapSelect.value;
            
            if (!selectedMapId) {
                alert('Please select a map from the dropdown first.');
                return;
            }

            if (!window.firebaseDB) {
                alert('Firebase not initialized. Please check your Firebase configuration.');
                return;
            }

            // Import getDoc dynamically with proper error handling
            const { getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            
            console.log('Loading map with ID:', selectedMapId);
            console.log('Firebase DB instance:', window.firebaseDB);
            
            const mapDoc = window.firebaseDoc(window.firebaseDB, 'maps', selectedMapId);
            const docSnap = await getDoc(mapDoc);
            
            if (docSnap.exists()) {
                const mapData = docSnap.data();
                console.log('Map data loaded:', mapData);
                
                // Track the current Firebase map ID for auto-save
                this.currentFirebaseMapId = selectedMapId;
                
                // Load the map data
                this.currentMapImage = mapData.image;
                this.mapComponents = mapData.components || [];
                this.componentCounter = this.mapComponents.length + 1;
                this.currentFloor = parseInt(selectedMapId);
                
                // Update the floor number input to match the loaded map
                this.updateFloorDisplay();
                
                // Display the map (components will be rendered after image loads)
                this.displayMapImage(false);
                
                this.showNotification(`Map "${mapData.name}" loaded successfully!`, 'success');
            } else {
                console.error('Map document does not exist:', selectedMapId);
                alert('Map not found! Please refresh the maps list and try again.');
            }
        } catch (error) {
            console.error('Error loading map from Firebase:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            alert('Error loading map from Firebase: ' + error.message);
        }
    }

    // Auto-save to Firebase if we have a loaded Firebase map
    async autoSaveToFirebase() {
        if (!this.currentFirebaseMapId || !window.firebaseDB) {
            return; // No Firebase map loaded or Firebase not available
        }

        try {
            // Import updateDoc dynamically
            const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            
            const mapDoc = window.firebaseDoc(window.firebaseDB, 'maps', this.currentFirebaseMapId);
            
            const updateData = {
                components: this.mapComponents,
                updatedAt: new Date().toISOString()
            };
            
            await updateDoc(mapDoc, updateData);
            console.log('Map auto-saved to Firebase');
            
            // Show subtle notification
            this.showNotification('Map updated in Firebase', 'success');
        } catch (error) {
            console.error('Error auto-saving to Firebase:', error);
            // Don't show error notification for auto-save failures to avoid spam
        }
    }

    // Authentication Methods
    initAuth() {
        if (window.firebaseOnAuthStateChanged && window.firebaseAuth) {
            window.firebaseOnAuthStateChanged(window.firebaseAuth, (user) => {
                if (user) {
                    this.isAuthenticated = true;
                    this.currentUser = user;
                    this.updateAuthUI(true);
                } else {
                    this.isAuthenticated = false;
                    this.currentUser = null;
                    this.updateAuthUI(false);
                }
            });
        }
    }

    updateAuthUI(isAuthenticated) {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const adminBtn = document.getElementById('admin-btn');

        if (isAuthenticated) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (adminBtn) adminBtn.style.display = 'inline-block';
        } else {
            // User is not logged in
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            
            // Switch to dashboard if user is not authenticated
            this.switchToDashboard();
        }
    }

    async signOut() {
        if (window.firebaseSignOut && window.firebaseAuth) {
            try {
                await window.firebaseSignOut(window.firebaseAuth);
                this.showNotification('Signed out successfully', 'success');
            } catch (error) {
                console.error('Sign out error:', error);
                this.showNotification('Error signing out', 'error');
            }
        }
    }

    // NFC Writer Modal Methods
    setupNFCModal() {
        // Close modal buttons
        document.getElementById('close-nfc-modal').addEventListener('click', () => {
            this.closeNFCModal();
        });

        document.getElementById('cancel-nfc-btn').addEventListener('click', () => {
            this.closeNFCModal();
        });

        // Write NFC button
        document.getElementById('write-nfc-btn').addEventListener('click', () => {
            this.writeNFCTag();
        });

        // Close modal when clicking outside
        document.getElementById('nfc-writer-modal').addEventListener('click', (e) => {
            if (e.target.id === 'nfc-writer-modal') {
                this.closeNFCModal();
            }
        });
    }

    openNFCWriterModal(component) {
        // Store the component being assigned
        this.nfcAssignmentComponent = component;
        
        // Update modal content
        document.getElementById('nfc-component-name').textContent = `Table ${component.id}`;
        document.getElementById('nfc-floor-number').textContent = this.currentFloor;
        
        // Reset form fields
        document.getElementById('nfc-api-key').value = '';
        document.getElementById('nfc-ssid').value = '';
        document.getElementById('nfc-network-password').value = '';
        
        // Reset status
        this.updateNFCStatus('ready', 'Ready to write NFC tag');
        
        // Show modal
        document.getElementById('nfc-writer-modal').style.display = 'flex';
    }

    closeNFCModal() {
        document.getElementById('nfc-writer-modal').style.display = 'none';
        this.nfcAssignmentComponent = null;
    }

    updateNFCStatus(status, message) {
        const statusElement = document.getElementById('nfc-status');
        const statusMessage = statusElement.querySelector('.status-message');
        
        // Remove existing status classes
        statusElement.classList.remove('ready', 'writing', 'success', 'error');
        
        // Add new status class
        statusElement.classList.add(status);
        
        // Update message
        statusMessage.innerHTML = `<p>${message}</p>`;
        
        if (status === 'ready') {
            statusMessage.innerHTML += '<p class="device-info">Note: NFC writing works best on Android devices</p>';
        }
    }

    async writeNFCTag() {
        if (!this.nfcAssignmentComponent) {
            this.showNotification('No component selected for NFC assignment', 'error');
            return;
        }

        // Get form values
        const apiKey = document.getElementById('nfc-api-key').value.trim();
        const ssid = document.getElementById('nfc-ssid').value.trim();
        const networkPwd = document.getElementById('nfc-network-password').value.trim();

        // Validate form
        if (!apiKey || !ssid || !networkPwd) {
            this.showNotification('Please fill in all NFC configuration fields', 'error');
            return;
        }

        // Update status to writing
        this.updateNFCStatus('writing', 'Writing to NFC tag... Please hold your device close to the tag.');
        
        // Disable write button
        const writeBtn = document.getElementById('write-nfc-btn');
        writeBtn.disabled = true;
        writeBtn.textContent = 'Writing...';

        try {
            // Import NFC utility functions
            const { assignNFC, isNFCSupported, getNFCErrorMessage } = await import('./nfcUtil.js');
            
            // Check NFC support
            if (!isNFCSupported()) {
                throw new Error('NFC is not supported on this device. Please use an Android device with NFC capability.');
            }

            // Write to NFC tag
            const result = await assignNFC(
                this.nfcAssignmentComponent.id,
                apiKey,
                ssid,
                networkPwd
            );

            if (result.success) {
                this.updateNFCStatus('success', 'NFC tag written successfully!');
                this.showNotification(`NFC tag assigned to Table ${this.nfcAssignmentComponent.id}`, 'success');
                
                // Close modal after a short delay
                setTimeout(() => {
                    this.closeNFCModal();
                }, 2000);
            } else {
                throw result.error;
            }
        } catch (error) {
            console.error('NFC write error:', error);
            const errorMessage = error.message || 'Failed to write NFC tag';
            this.updateNFCStatus('error', errorMessage);
            this.showNotification(errorMessage, 'error');
        } finally {
            // Re-enable write button
            writeBtn.disabled = false;
            writeBtn.textContent = 'Write NFC Tag';
        }
    }

    // Maps Real-time Listener Methods
    setupMapsListener() {
        if (!window.firebaseDB || !window.firebaseOnSnapshot) {
            console.log('Firebase not initialized, skipping maps listener setup');
            return;
        }

        // Clean up existing listener
        this.cleanupMapsListener();

        try {
            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            
            this.mapsListener = window.firebaseOnSnapshot(mapsCollection, (snapshot) => {
                this.handleMapsChange(snapshot);
            }, (error) => {
                console.error('Maps listener error:', error);
                this.showNotification('Error listening to maps updates', 'error');
            });
            
        } catch (error) {
            console.error('Error setting up maps listener:', error);
            this.showNotification('Error setting up maps listener', 'error');
        }
    }

    handleMapsChange(snapshot) {
        const changes = snapshot.docChanges();
        let hasChanges = false;
        
        changes.forEach((change) => {
            const mapId = change.doc.id;
            const mapData = change.doc.data();
            
            switch (change.type) {
                case 'added':
                    this.currentMaps.set(mapId, { ...mapData, id: mapId });
                    hasChanges = true;
                    this.showMapsNotification(`New map added: ${mapData.name || `Floor ${parseInt(mapId)}`}`, 'success');
                    break;
                    
                case 'modified':
                    this.currentMaps.set(mapId, { ...mapData, id: mapId });
                    hasChanges = true;
                    this.showMapsNotification(`Map updated: ${mapData.name || `Floor ${parseInt(mapId)}`}`, 'info');
                    break;
                    
                case 'removed':
                    this.currentMaps.delete(mapId);
                    hasChanges = true;
                    this.showMapsNotification(`Map deleted: ${mapId}`, 'warning');
                    break;
            }
        });
        
        // Update the UI if we're on the maps overview screen
        if (hasChanges && document.getElementById('maps-screen').classList.contains('active')) {
            this.updateMapsOverview();
        }
    }

    updateMapsOverview() {
        const mapsGrid = document.getElementById('maps-grid');
        if (!mapsGrid) return;
        
        // Clear existing cards
        mapsGrid.innerHTML = '';
        
        if (this.currentMaps.size === 0) {
            mapsGrid.innerHTML = `
                <div class="no-maps-placeholder" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <h3>No Maps Found</h3>
                    <p>No maps have been created yet.</p>
                    <button class="action-btn create-btn" onclick="window.tableManager.switchToAdmin()">Create Your First Map</button>
                </div>
            `;
            return;
        }
        
        // Sort maps by floor number
        const maps = Array.from(this.currentMaps.values()).sort((a, b) => {
            const floorA = parseInt(a.id) || 0;
            const floorB = parseInt(b.id) || 0;
            return floorA - floorB;
        });
        
        // Create map cards
        maps.forEach(map => {
            const mapCard = this.createMapCard(map);
            mapsGrid.appendChild(mapCard);
        });
    }

    showMapsNotification(message, type) {
        // Only show notifications if we're on the maps overview screen
        if (document.getElementById('maps-screen').classList.contains('active')) {
            this.showNotification(message, type);
        }
    }

    cleanupMapsListener() {
        if (this.mapsListener) {
            this.mapsListener();
            this.mapsListener = null;
        }
        this.currentMaps.clear();
    }

    // Map Components Real-time Listener Methods (for dashboard occupancy updates)
    setupMapComponentsListener() {
        if (!window.firebaseDB || !window.firebaseOnSnapshot) {
            console.log('Firebase not initialized, skipping map components listener setup');
            return;
        }

        // Clean up existing listener
        this.cleanupMapComponentsListener();

        try {
            // Listen to the specific map document for this floor
            const mapDoc = window.firebaseDoc(window.firebaseDB, 'maps', this.currentFloor.toString());
            
            this.mapComponentsListener = window.firebaseOnSnapshot(mapDoc, (docSnapshot) => {
                this.handleMapComponentsChange(docSnapshot);
            }, (error) => {
                console.error('Map components listener error:', error);
                this.showNotification('Error listening to map component updates', 'error');
            });
            
        } catch (error) {
            console.error('Error setting up map components listener:', error);
            this.showNotification('Error setting up map components listener', 'error');
        }
    }

    handleMapComponentsChange(docSnapshot) {
        if (!docSnapshot.exists()) {
            return;
        }

        const mapData = docSnapshot.data();
        const newComponents = mapData.components || [];
        
        // Check for occupancy changes in table components
        const tableComponents = newComponents.filter(comp => comp.type === 'table');
        
        tableComponents.forEach(newComponent => {
            const componentId = newComponent.id.toString();
            const currentComponent = this.currentMapComponents.get(componentId);
            
            // Check if occupancy status changed
            if (currentComponent && currentComponent.occupied !== newComponent.occupied) {
                // Update the dashboard UI for this table
                this.updateDashboardTableOccupancy(componentId, newComponent.occupied);
                
                // Show notification
                const status = newComponent.occupied ? 'occupied' : 'available';
                this.showNotification(`Table ${componentId} is now ${status}`, newComponent.occupied ? 'warning' : 'success');
            }
            
            // Update the stored component data with the latest version
            this.currentMapComponents.set(componentId, newComponent);
        });
    }

    updateDashboardTableOccupancy(tableId, isOccupied) {
        // Find the table element in the dashboard using its data attribute
        const mapContainer = document.getElementById('table-map');
        if (!mapContainer) {
            console.error('Dashboard map container not found.');
            return;
        }
        
        const targetTable = mapContainer.querySelector(`[data-table-id="${tableId}"]`);
        
        if (targetTable) {
            this.updateTableElement(targetTable, isOccupied);
        }
    }

    updateTableElement(tableElement, isOccupied) {
        // Update the table appearance based on occupancy
        if (isOccupied) {
            tableElement.style.backgroundColor = 'rgba(231, 76, 60, 0.8)'; // Red for occupied
            tableElement.style.border = `2px solid #c0392b`;
        } else {
            tableElement.style.backgroundColor = 'rgba(52, 152, 219, 0.8)'; // Blue for available
            tableElement.style.border = `2px solid #2980b9`;
        }
        
        // Add or remove the occupied "X" indicator
        const existingIndicator = tableElement.querySelector('.occupied-indicator');
        if (isOccupied && !existingIndicator) {
            const occupiedIndicator = document.createElement('div');
            occupiedIndicator.className = 'occupied-indicator';
            
            // Re-calculate scaled size for the indicator
            const scaledSize = tableElement.offsetWidth;
            const indicatorSize = Math.max(10, scaledSize * 0.4);

            occupiedIndicator.style.cssText = `
                position: absolute;
                top: -3px;
                right: -3px;
                background-color: #c0392b;
                color: white;
                border-radius: 50%;
                width: ${indicatorSize}px;
                height: ${indicatorSize}px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${Math.max(0.5, indicatorSize * 0.04)}rem;
            `;
            occupiedIndicator.textContent = '✕';
            tableElement.appendChild(occupiedIndicator);
        } else if (!isOccupied && existingIndicator) {
            existingIndicator.remove();
        }
    }


    cleanupMapComponentsListener() {
        if (this.mapComponentsListener) {
            this.mapComponentsListener();
            this.mapComponentsListener = null;
        }
        this.currentMapComponents.clear();
    }

    // Maps Overview Methods
    async loadMapsOverview() {
        const mapsGrid = document.getElementById('maps-grid');
        mapsGrid.innerHTML = '<div class="loading-placeholder">Loading maps...</div>';
        
        try {
            if (!window.firebaseDB) {
                throw new Error('Firebase not initialized');
            }

            // If we already have maps data from the real-time listener, use it
            if (this.currentMaps.size > 0) {
                this.updateMapsOverview();
                this.showNotification(`Loaded ${this.currentMaps.size} maps`, 'success');
                return;
            }

            // Otherwise, fetch initial data
            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            const querySnapshot = await window.firebaseGetDocs(mapsCollection);
            
            if (querySnapshot.empty) {
                mapsGrid.innerHTML = `
                    <div class="no-maps-placeholder" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                        <h3>No Maps Found</h3>
                        <p>No maps have been created yet.</p>
                        <button class="action-btn create-btn" onclick="window.tableManager.switchToAdmin()">Create Your First Map</button>
                    </div>
                `;
                return;
            }

            // Populate currentMaps with initial data
            this.currentMaps.clear();
            querySnapshot.forEach((doc) => {
                const mapData = doc.data();
                this.currentMaps.set(doc.id, {
                    id: doc.id,
                    ...mapData,
                    floor: parseInt(doc.id)
                });
            });

            // Update the UI with the loaded data
            this.updateMapsOverview();
            this.showNotification(`Loaded ${this.currentMaps.size} maps`, 'success');
            
        } catch (error) {
            console.error('Error loading maps overview:', error);
            mapsGrid.innerHTML = `
                <div class="error-placeholder" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <h3>Error Loading Maps</h3>
                    <p>Unable to load maps from Firebase.</p>
                    <p>Please check your connection and try again.</p>
                </div>
            `;
        }
    }

    createMapCard(mapData) {
        const card = document.createElement('div');
        card.className = 'map-card';
        card.dataset.mapId = mapData.id;
        
        const componentCount = mapData.components ? mapData.components.length : 0;
        const tableCount = mapData.components ? mapData.components.filter(c => c.type === 'table').length : 0;
        
        const createdDate = mapData.createdAt ? new Date(mapData.createdAt).toLocaleDateString() : 'Unknown';
        const updatedDate = mapData.updatedAt ? new Date(mapData.updatedAt).toLocaleDateString() : 'Unknown';
        
        card.innerHTML = `
            <div class="map-card-header">
                <div class="map-card-title">${mapData.name || `Floor ${mapData.floor} Map`}</div>
                <div class="map-card-floor">Floor ${mapData.floor}</div>
                <div class="map-card-id">ID: ${mapData.id}</div>
            </div>
            
            <div class="map-card-body">
                <div class="map-preview">
                    ${mapData.image ? 
                        `<img src="${mapData.image}" alt="Map preview" onerror="this.parentElement.innerHTML='<div class=\\"map-preview-placeholder\\">Image failed to load</div>'">` :
                        '<div class="map-preview-placeholder">No image available</div>'
                    }
                </div>
                
                <div class="map-stats">
                    <div class="map-stat">
                        <span class="map-stat-value">${componentCount}</span>
                        <span class="map-stat-label">Total Components</span>
                    </div>
                    <div class="map-stat">
                        <span class="map-stat-value">${tableCount}</span>
                        <span class="map-stat-label">Tables</span>
                    </div>
                </div>
                
                <div class="map-actions">
                    <button class="map-action-btn primary" data-action="load" data-map-id="${mapData.id}">Load Map</button>
                    <button class="map-action-btn secondary" data-action="preview" data-map-id="${mapData.id}">Preview</button>
                    ${this.isAuthenticated ? `<button class="map-action-btn danger" data-action="delete" data-map-id="${mapData.id}">Delete</button>` : ''}
                </div>
            </div>
            
            <div class="map-card-footer">
                <div class="map-timestamp">
                    <span>Created: ${createdDate}</span>
                    <span class="map-status active">Active</span>
                </div>
                <div class="map-timestamp">
                    <span>Updated: ${updatedDate}</span>
                </div>
            </div>
        `;
        
        // Add event listeners for action buttons
        const actionButtons = card.querySelectorAll('.map-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const mapId = btn.dataset.mapId;
                this.handleMapAction(action, mapId);
            });
        });
        
        return card;
    }

    async handleMapAction(action, mapId) {
        try {
            switch (action) {
                case 'load':
                    await this.loadMapInAdmin(mapId);
                    break;
                case 'preview':
                    await this.previewMap(mapId);
                    break;
                case 'delete':
                    await this.deleteMap(mapId);
                    break;
                default:
                    console.log('Unknown action:', action);
            }
        } catch (error) {
            console.error('Error handling map action:', error);
            this.showNotification('Error performing action', 'error');
        }
    }

    async loadMapInAdmin(mapId) {
        // Switch to admin mode and load the map
        this.switchToAdmin();
        
        // Wait a moment for the admin screen to load, then load the map
        setTimeout(async () => {
            try {
                const mapDoc = window.firebaseDoc(window.firebaseDB, 'maps', mapId);
                const docSnap = await window.firebaseGetDoc(mapDoc);
                
                if (docSnap.exists()) {
                    const mapData = docSnap.data();
                    
                    // Update the map selector dropdown
                    const mapSelect = document.getElementById('map-select');
                    mapSelect.value = mapId;
                    
                    // Enable the load button
                    const loadBtn = document.getElementById('load-selected-map-btn');
                    loadBtn.disabled = false;
                    
                    // Load the map
                    await this.loadSelectedFirebaseMap();
                    
                    this.showNotification(`Loaded map for Floor ${mapData.floor}`, 'success');
                } else {
                    this.showNotification('Map not found', 'error');
                }
            } catch (error) {
                console.error('Error loading map:', error);
                this.showNotification('Error loading map', 'error');
            }
        }, 500);
    }

    async previewMap(mapId) {
        // Create a modal to preview the map
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        
        try {
            const mapDoc = window.firebaseDoc(window.firebaseDB, 'maps', mapId);
            const docSnap = await window.firebaseGetDoc(mapDoc);
            
            if (docSnap.exists()) {
                const mapData = docSnap.data();
                
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 80vw; max-height: 80vh; overflow: auto;">
                        <div class="modal-header">
                            <h3>Map Preview: ${mapData.name || `Floor ${mapData.floor}`}</h3>
                            <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div style="text-align: center; margin-bottom: 1rem;">
                                <strong>Floor ${mapData.floor}</strong> • ${mapData.components?.length || 0} components
                            </div>
                            ${mapData.image ? 
                                `<img src="${mapData.image}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Map preview">` :
                                '<div style="text-align: center; padding: 2rem; color: #7f8c8d;">No image available</div>'
                            }
                        </div>
                        <div class="modal-footer">
                            <button class="action-btn primary-btn" onclick="window.tableManager.loadMapInAdmin('${mapId}'); this.closest('.modal-overlay').remove();">Load in Editor</button>
                            <button class="action-btn secondary-btn" onclick="this.closest('.modal-overlay').remove();">Close</button>
                        </div>
                    </div>
                `;
            } else {
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Error</h3>
                            <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Map not found.</p>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error previewing map:', error);
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Error</h3>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Error loading map preview.</p>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async deleteMap(mapId) {
        if (!this.isAuthenticated) {
            this.showNotification('Please log in to delete maps', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete this map? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const mapDoc = window.firebaseDoc(window.firebaseDB, 'maps', mapId);
            await window.firebaseDeleteDoc(mapDoc);
            
            // Remove the card from the UI
            const card = document.querySelector(`[data-map-id="${mapId}"]`);
            if (card) {
                card.remove();
            }
            
            this.showNotification('Map deleted successfully', 'success');
            
            // Refresh the maps overview
            setTimeout(() => {
                this.loadMapsOverview();
            }, 1000);
            
        } catch (error) {
            console.error('Error deleting map:', error);
            this.showNotification('Error deleting map', 'error');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be initialized
    function waitForFirebaseAndInit() {
        try {
            if (window.firebaseInitialized && window.firebaseDB) {
                window.tableManager = new TableManager();
            } else {
                setTimeout(waitForFirebaseAndInit, 100);
            }
        } catch (error) {
            console.error('Error initializing TableManager:', error);
            // Fallback: initialize without Firebase
            window.tableManager = new TableManager();
        }
    }
    
    waitForFirebaseAndInit();
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);