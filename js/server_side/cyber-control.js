const net = require('net');
const ip = require('ip');
const main = require('../../main');
const desktopNames = [];
const desktopsArray = [];
const { ipcMain } = require('electron')
const log = require('electron-log');

global.clients = [];

var CyberControl = {
    createCyberServer: function () {
        var host = this.getIP();
        var port = 6969;
        
        // Create a server instance, and chain the listen function to it
        // The function passed to net.createServer() becomes the event handler for the 'connection' event
        // The sock object the callback function receives UNIQUE for each connection
        server = net.createServer(function(sock) {
            var client = {
                sock: sock,
                isOnline: true,
                data: {}
            };
            
            if (clients.length > 0) {
                // buscar maquina conectada
                const cli = clients.filter(w => w.sock.remoteAddress === client.sock.remoteAddress)[0];
                // si no se encontro la maquina en el arreglo
                // agregarla
                if (cli === undefined) {
                    clients.push(client);
                } else {
                    // si se encontro la maquina, actualizar el socket
                    clients.forEach((c, i) => {
                        const remoteAddress = c.sock.remoteAddress;
                        if (remoteAddress.includes(client.sock.remoteAddress)) {
                            clients[i] = client;
                            console.log('I just to update the client list for '+ client.sock.remoteAddress);
                        }
                    });
                }
            } else {
                // agregar la primera maquina
                clients.push(client);
            }
        
            
            // We have a connection - a socket object is assigned to the connection automatically
            console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
            
            
            // Add a 'data' event handler to this instance of socket
            sock.on('data', function(data) {
                try {
                    var textData = data.toString('utf8');
                    // var jsonData = null;
                    // jsonData = JSON.parse(textData);  
                    
                    var arrJson = [];
                    var countJsonString = (textData.match(/}/g) || []).length;
                    if (countJsonString > 1) {
                        var strJsonSplited = textData.split('}');
                        strJsonSplited.forEach(s => {
                            if (s.length > 0) {
                                arrJson.push(JSON.parse(s + '}'));
                            }
                        });
                    } else {
                        arrJson.push(JSON.parse(textData));
                    }
    
                    arrJson.forEach(j => {
                        var jsonData = j;
                        
                        if (jsonData !== null && jsonData.IP !== undefined) {
                            for(var i = 0; i < clients.length; i++) {
                                const remoteAddress = clients[i].sock.remoteAddress;
                                if(remoteAddress.includes(jsonData.IP)) {
                                    clients[i].data = jsonData;
                                }
                            }
                            main.getMainWindow().webContents.send('clientConnected', JSON.stringify({ connected: true, hostname: jsonData.hostname }));
                        } else if (jsonData !== null && jsonData.idComputadora !== undefined && jsonData.timeOff === undefined) {
                            main.getMainWindow().webContents.send('record', JSON.stringify(jsonData));
                        } else if (jsonData !== null && jsonData.timeOff !== undefined) {
                            main.getMainWindow().webContents.send('record', JSON.stringify(jsonData));
                            main.getMainWindow().webContents.send('time-off', jsonData.timeOff.client);
                        } else if (jsonData !== null && jsonData.closeApp) {
                            main.getMainWindow().webContents.send('clientClosed', jsonData.hostname);
                        } else if (jsonData !== null && jsonData.requestDesktopInfo) {
                            main.getMainWindow().webContents.send('requestDesktopInfo', jsonData.client);
                        } else if (jsonData !== null && jsonData.init) {
                            main.getMainWindow().webContents.send('requestDesktopRecord', jsonData.client);
                        }
                    });
                } catch (e) {
                    log.info(e);
                }
            });
          
            // Add a 'close' event handler to this instance of socket
            sock.on('close', function(data) {
                var textData = data.toString('utf8');
                main.getMainWindow().webContents.send('clientClosed', sock.remoteAddress);
                console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
            });
        
            sock.on('error', function(data){
                console.error('Error message: ' + data.message + '\n\nStack' + data.stack);
            });
        
            sock.on('clientError', function(data){
                console.error('Client Error message: ' + data.message + '\n\nStack' + data.stack);
            });
            
        });

        server.getConnections((err, count) => {
            if(!err) {
                console.log(count);
            } else {
                console.log(err);
            }
        });
      
        server.listen(port, host);
        
        console.log('Server listening on ' + host +':'+ port);
    },

    getIP: function () {
        var ipAddress = '';

        try {
            var ipEthernet = ip.address('Ethernet');
            ipAddress = ipEthernet;
        } catch (e) {
            
        }

        try {
            var ipWifi = ip.address('Wi-Fi');
            ipAddress = ipWifi;
        } catch (e) {
            
        }
        
        return ipAddress;
    }
}

// Listen for async-reply message from main process
ipcMain.on('getSockets', (event, arg) => { 
    // Send sync message to main process
    event.sender.send('sockets', { clients: clients, desktopInfo: arg });
  });

module.exports = CyberControl;