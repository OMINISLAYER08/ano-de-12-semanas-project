const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Path to user data
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'data.json');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#0a0e27',
        titleBarStyle: 'default',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Remove menu bar for cleaner look
    mainWindow.setMenuBarVisibility(false);

    // Load the index.html
    mainWindow.loadFile('index.html');

    // Open DevTools in development mode
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers for file operations
ipcMain.handle('save-data', async (event, data) => {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log('✅ Dados salvos em:', dataFilePath);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-data', async () => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = fs.readFileSync(dataFilePath, 'utf-8');
            console.log('✅ Dados carregados de:', dataFilePath);
            return { success: true, data: JSON.parse(data) };
        } else {
            console.log('ℹ️ Nenhum arquivo de dados encontrado');
            return { success: true, data: null };
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-data-path', async () => {
    return dataFilePath;
});
