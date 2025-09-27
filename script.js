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
        this.currentTool = 'table';
        this.componentCounter = 1;
        
        this.init();
        this.loadFirebaseMaps();
    }

    // Generate sample floor data with some occupied tables
    generateFloorData(floorNumber) {
        const tables = [];
        const tableCount = 18; // 6x3 grid
        
        for (let i = 1; i <= tableCount; i++) {
            // Randomly assign some tables as occupied
            const isOccupied = Math.random() < 0.3; // 30% chance of being occupied
            
            tables.push({
                id: `${floorNumber}-${i}`,
                number: i,
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

        document.getElementById('admin-btn').addEventListener('click', () => {
            this.switchToAdmin();
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
        document.getElementById('upload-area').addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('dragover');
        });

        document.getElementById('upload-area').addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('dragover');
        });

        document.getElementById('upload-area').addEventListener('drop', (e) => {
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

        document.getElementById('delete-component-btn').addEventListener('click', () => {
            this.deleteSelectedComponent();
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

        document.getElementById('upload-map-btn').addEventListener('click', () => {
            document.getElementById('map-file-input').click();
        });

        // Firebase Save button
        document.getElementById('save-map-firebase-btn').addEventListener('click', () => {
            this.saveMapToFirebase();
        });

        // Map selector functionality
        document.getElementById('load-selected-map-btn').addEventListener('click', () => {
            this.loadSelectedFirebaseMap();
        });

        document.getElementById('refresh-maps-btn').addEventListener('click', () => {
            this.loadFirebaseMaps();
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
    }

    switchToDashboard() {
        document.getElementById('dashboard-screen').classList.add('active');
        document.getElementById('admin-screen').classList.remove('active');
        document.getElementById('dashboard-btn').classList.add('active');
        document.getElementById('admin-btn').classList.remove('active');
        this.isAdminMode = false;
    }

    switchToAdmin() {
        document.getElementById('dashboard-screen').classList.remove('active');
        document.getElementById('admin-screen').classList.add('active');
        document.getElementById('dashboard-btn').classList.remove('active');
        document.getElementById('admin-btn').classList.add('active');
        this.isAdminMode = true;
        this.switchToMapGenerator();
    }


    switchToMapGenerator() {
        this.isMapGeneratorMode = true;
        this.renderMapGenerator();
    }

    switchFloor(floorNumber) {
        this.currentFloor = floorNumber;
        
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
            // Get the most recent map for this floor
            const mapData = await this.getMostRecentMapForFloor(this.currentFloor);
            
            if (mapData) {
                // Display the map with components
                this.displayDashboardMap(mapData);
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

        // Get the actual displayed dimensions of the image on screen (after responsive sizing)
        const currentDisplayedWidth = img.offsetWidth;
        const currentDisplayedHeight = img.offsetHeight;
        
        console.log("Current displayed size:", currentDisplayedWidth, currentDisplayedHeight);
        console.log("Component positions (normalized):", components.map(c => ({x: c.x, y: c.y})));

        components
            .filter(component => component.type === 'table')
            .forEach(component => {
                const tableElement = document.createElement('div');
                tableElement.className = 'dashboard-table-component';
                tableElement.style.position = 'absolute';
                
                // Convert normalized coordinates (0-1) to pixel positions
                // Add back the 20px offset that was subtracted during coordinate capture
                const pixelX = component.x * currentDisplayedWidth + 10;
                const pixelY = component.y * currentDisplayedHeight;
                
                tableElement.style.left = `${pixelX}px`;
                tableElement.style.top = `${pixelY}px`;
                
                // Scale the component size proportionally based on image size
                const baseSize = 30;
                const scaleFactor = Math.min(currentDisplayedWidth / 800, currentDisplayedHeight / 600);
                const scaledSize = Math.max(15, Math.min(50, baseSize * scaleFactor));
                tableElement.style.width = `${scaledSize}px`;
                tableElement.style.height = `${scaledSize}px`;
                
                tableElement.style.backgroundColor = component.occupied ? 'rgba(231, 76, 60, 0.8)' : 'rgba(52, 152, 219, 0.8)';
                tableElement.style.border = `2px solid ${component.occupied ? '#e74c3c' : '#3498db'}`;
                tableElement.style.borderRadius = '50%';
                tableElement.style.display = 'flex';
                tableElement.style.alignItems = 'center';
                tableElement.style.justifyContent = 'center';
                tableElement.style.color = 'white';
                tableElement.style.fontWeight = 'bold';
                tableElement.style.fontSize = `${Math.max(0.6, scaledSize * 0.02)}rem`;
                tableElement.style.cursor = 'default';
                tableElement.style.zIndex = '10';

                // Add occupied indicator with scaled size
                if (component.occupied) {
                    const occupiedIndicator = document.createElement('div');
                    occupiedIndicator.style.position = 'absolute';
                    occupiedIndicator.style.top = '-3px';
                    occupiedIndicator.style.right = '-3px';
                    occupiedIndicator.style.backgroundColor = '#c0392b';
                    occupiedIndicator.style.color = 'white';
                    occupiedIndicator.style.borderRadius = '50%';
                    
                    const indicatorSize = Math.max(10, scaledSize * 0.4);
                    occupiedIndicator.style.width = `${indicatorSize}px`;
                    occupiedIndicator.style.height = `${indicatorSize}px`;
                    occupiedIndicator.style.display = 'flex';
                    occupiedIndicator.style.alignItems = 'center';
                    occupiedIndicator.style.justifyContent = 'center';
                    occupiedIndicator.style.fontSize = `${Math.max(0.5, indicatorSize * 0.04)}rem`;
                    occupiedIndicator.textContent = '✕';
                    tableElement.appendChild(occupiedIndicator);
                }

                // Add table number
                const tableNumber = document.createElement('div');
                tableNumber.textContent = component.name.replace(/[^\d]/g, '') || '?';
                tableElement.appendChild(tableNumber);

                // Add hover effect (view only)
                tableElement.addEventListener('mouseenter', () => {
                    tableElement.style.transform = 'scale(1.1)';
                    tableElement.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.4)';
                });

                tableElement.addEventListener('mouseleave', () => {
                    tableElement.style.transform = 'scale(1)';
                    tableElement.style.boxShadow = 'none';
                });

                container.appendChild(tableElement);
            });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
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
    }

    handleCanvasClick(e) {
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

        console.log("Canvas: ", canvasX, canvasY);

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

        // Centers the click
        const normX = (imageX - 20) / imgWidth;
        const normY = (imageY - 20) / imgHeight;

        this.createComponent(normX, normY);
    }

    createComponent(x, y) {
        const component = {
            id: `component-${this.componentCounter++}`,
            type: this.currentTool,
            name: `${this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1)} ${this.componentCounter - 1}`,
            x: x,
            y: y,
            capacity: 2,
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
            // Add back the 20px offset that was subtracted during coordinate capture
            element.style.left = `${component.x * imgWidth + imageOffsetX}px`;
            element.style.top = `${component.y * imgHeight + imageOffsetY}px`;

            if (component.occupied) {
                element.classList.add('occupied');
            }
            
            element.textContent = component.name.replace(/[^\d]/g, '') || '?';
            element.title = `${component.name} (${component.type})`;
            
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectComponent(component);
            });

            canvas.appendChild(element);
        });
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
            
            const nameInput = document.getElementById('component-name');
            const capacityInput = document.getElementById('component-capacity');
            
            if (nameInput) {
                nameInput.value = this.selectedComponent.name;
            }
            if (capacityInput) {
                capacityInput.value = this.selectedComponent.capacity;
            }
        } else {
            propertiesDiv.style.display = 'none';
        }
    }

    saveComponentProperties() {
        if (!this.selectedComponent) return;

        const nameInput = document.getElementById('component-name');
        const capacityInput = document.getElementById('component-capacity');
        
        if (!nameInput || !capacityInput) {
            this.showNotification('Component properties form not found', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const capacity = parseInt(capacityInput.value) || 1;

        if (!name) {
            this.showNotification('Please enter a name for the component', 'error');
            return;
        }

        this.selectedComponent.name = name;
        this.selectedComponent.capacity = capacity;
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
                this.displayMapImage();
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
                // Extract table number from name, fallback to component counter
                let tableNumber = parseInt(component.name.replace(/[^\d]/g, ''));
                if (!tableNumber || isNaN(tableNumber)) {
                    tableNumber = parseInt(component.id.replace(/[^\d]/g, '')) || 1;
                }
                
                tables.push({
                    id: `table-${this.currentFloor}-${tableNumber}`,
                    number: tableNumber,
                    floor: this.currentFloor,
                    occupied: component.occupied || false,
                    assignedTo: component.assignedTo || null,
                    x: component.x,
                    y: component.y,
                    capacity: component.capacity || 2,
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

        const tableComponents = this.mapComponents.filter(c => c.type === 'table');
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
        const canvas = document.getElementById('map-canvas');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const fullscreenIcon = fullscreenBtn.querySelector('.fullscreen-icon');
        
        if (canvas.classList.contains('fullscreen')) {
            // Exit fullscreen
            canvas.classList.remove('fullscreen');
            fullscreenIcon.textContent = '⛶';
            document.body.style.overflow = '';
        } else {
            // Enter fullscreen
            canvas.classList.add('fullscreen');
            fullscreenIcon.textContent = '✕';
            document.body.style.overflow = 'hidden';
        }
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
        }
        
        this.renderMapComponents();
        this.updateComponentProperties();
    }

    // Firebase Methods
    async getMostRecentMapForFloor(floorNumber) {
        try {
            if (!window.firebaseDB) {
                console.log('Firebase not initialized yet');
                return null;
            }

            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            const querySnapshot = await window.firebaseGetDocs(mapsCollection);
            
            let mostRecentMap = null;
            let mostRecentDate = null;
            
            querySnapshot.forEach((doc) => {
                const mapData = doc.data();
                if (mapData.floor === floorNumber) {
                    const createdAt = new Date(mapData.createdAt);
                    if (!mostRecentDate || createdAt > mostRecentDate) {
                        mostRecentMap = { id: doc.id, ...mapData };
                        mostRecentDate = createdAt;
                    }
                }
            });
            
            return mostRecentMap;
        } catch (error) {
            console.error('Error getting most recent map for floor:', error);
            return null;
        }
    }

    async loadFirebaseMaps() {
        try {
            if (!window.firebaseDB) {
                console.log('Firebase not initialized yet');
                return;
            }

            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            const querySnapshot = await window.firebaseGetDocs(mapsCollection);
            
            const mapSelect = document.getElementById('map-select');
            mapSelect.innerHTML = '<option value="">Choose existing map...</option>';
            
            querySnapshot.forEach((doc) => {
                const mapData = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${mapData.name} (Floor ${mapData.floor})`;
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
                alert('Firebase not initialized. Please check your Firebase configuration.');
                return;
            }

            const mapName = prompt('Enter a name for this map:');
            if (!mapName) return;

            const mapData = {
                name: mapName,
                floor: this.currentFloor,
                image: this.currentMapImage,
                components: this.mapComponents,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const mapsCollection = window.firebaseCollection(window.firebaseDB, 'maps');
            await window.firebaseAddDoc(mapsCollection, mapData);
            
            this.showNotification('Map saved to Firebase successfully!', 'success');
            this.loadFirebaseMaps(); // Refresh the map list
        } catch (error) {
            console.error('Error saving map to Firebase:', error);
            alert('Error saving map to Firebase: ' + error.message);
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
                this.currentFloor = mapData.floor;
                
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tableManager = new TableManager();
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
