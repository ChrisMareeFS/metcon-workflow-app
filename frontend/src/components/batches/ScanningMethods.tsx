import { useState, useRef, useEffect } from 'react';
import { Camera, FileText, QrCode, Radio, Scan, Scale, Mic, Zap, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export type ScanningMethod = 'paper' | 'qr' | 'rfid' | 'barcode' | 'scale' | 'voice' | 'manual';

interface ScanningMethodsProps {
  selectedMethod: ScanningMethod;
  onMethodSelect: (method: ScanningMethod) => void;
  onQRCodeScanned?: (data: string) => void;
  onRFIDScanned?: (data: string) => void;
  onBarcodeScanned?: (data: string) => void;
}

export default function ScanningMethods({
  selectedMethod,
  onMethodSelect,
  onQRCodeScanned,
  onRFIDScanned,
  onBarcodeScanned,
}: ScanningMethodsProps) {
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [isScanningRFID, setIsScanningRFID] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // QR Code Scanning
  useEffect(() => {
    if (selectedMethod === 'qr' && !isScanningQR && videoRef.current) {
      startQRScanner();
    } else if (selectedMethod !== 'qr' && qrScannerRef.current) {
      stopQRScanner();
    }
    return () => {
      if (qrScannerRef.current) {
        stopQRScanner();
      }
    };
  }, [selectedMethod, isScanningQR]);

  const startQRScanner = async () => {
    try {
      setIsScanningQR(true);
      const scanner = new Html5Qrcode('qr-reader');
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('QR Code scanned:', decodedText);
          onQRCodeScanned?.(decodedText);
          stopQRScanner();
        },
        () => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );
    } catch (error) {
      console.error('QR Scanner error:', error);
      alert('Failed to start QR scanner. Please check camera permissions.');
      setIsScanningQR(false);
    }
  };

  const stopQRScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        await qrScannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping QR scanner:', error);
      }
      qrScannerRef.current = null;
    }
    setIsScanningQR(false);
  };

  // RFID/NFC Scanning
  const startRFIDScan = async () => {
    if (!('NDEFReader' in window)) {
      alert('NFC/RFID scanning is not supported on this device. Please use a device with NFC capability.');
      return;
    }

    try {
      setIsScanningRFID(true);
      const reader = new (window as any).NDEFReader();
      
      await reader.scan();
      
      reader.addEventListener('reading', (event: any) => {
        const message = event.message;
        const record = message.records[0];
        
        let data = '';
        if (record.recordType === 'text') {
          const decoder = new TextDecoder();
          data = decoder.decode(record.data);
        } else if (record.recordType === 'url') {
          const decoder = new TextDecoder();
          data = decoder.decode(record.data);
        } else {
          // For other types, try to decode as text
          try {
            const decoder = new TextDecoder();
            data = decoder.decode(record.data);
          } catch {
            data = Array.from(new Uint8Array(record.data))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
          }
        }
        
        console.log('RFID/NFC scanned:', data);
        onRFIDScanned?.(data);
        setIsScanningRFID(false);
      });

      reader.addEventListener('readingerror', () => {
        console.error('RFID reading error');
        setIsScanningRFID(false);
      });
    } catch (error: any) {
      console.error('RFID scan error:', error);
      if (error.name === 'NotAllowedError') {
        alert('NFC permission denied. Please allow NFC access in your browser settings.');
      } else {
        alert('Failed to start RFID scanner: ' + error.message);
      }
      setIsScanningRFID(false);
    }
  };

  // Barcode Scanning (using camera)
  const startBarcodeScan = async () => {
    try {
      setIsScanningBarcode(true);
      const scanner = new Html5Qrcode('barcode-reader');
      
      // Html5Qrcode also supports barcodes
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('Barcode scanned:', decodedText);
          onBarcodeScanned?.(decodedText);
          scanner.stop().then(() => scanner.clear());
          setIsScanningBarcode(false);
        },
        () => {}
      );
    } catch (error) {
      console.error('Barcode scanner error:', error);
      alert('Failed to start barcode scanner.');
      setIsScanningBarcode(false);
    }
  };

  const scanningMethods = [
    {
      id: 'paper' as ScanningMethod,
      name: 'Scan Job Paper',
      description: 'AI extracts batch details from photo',
      icon: Camera,
      color: 'primary',
      available: true,
    },
    {
      id: 'qr' as ScanningMethod,
      name: 'QR Code',
      description: 'Scan QR code from batch tag',
      icon: QrCode,
      color: 'blue',
      available: true,
    },
    {
      id: 'rfid' as ScanningMethod,
      name: 'RFID/NFC Tap',
      description: 'Tap RFID tag or NFC card',
      icon: Radio,
      color: 'purple',
      available: 'NDEFReader' in window,
    },
    {
      id: 'barcode' as ScanningMethod,
      name: 'Barcode',
      description: 'Scan barcode from label',
      icon: Scan,
      color: 'green',
      available: true,
    },
    {
      id: 'scale' as ScanningMethod,
      name: 'IoT Scale',
      description: 'Connect to digital scale',
      icon: Scale,
      color: 'orange',
      available: false, // Would need scale API integration
    },
    {
      id: 'voice' as ScanningMethod,
      name: 'Voice Input',
      description: 'Speak batch details',
      icon: Mic,
      color: 'pink',
      available: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    },
    {
      id: 'manual' as ScanningMethod,
      name: 'Manual Entry',
      description: 'Enter batch details by hand',
      icon: FileText,
      color: 'gray',
      available: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Method Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {scanningMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          const isAvailable = method.available === true;

          return (
            <button
              key={method.id}
              onClick={() => {
                if (isAvailable) {
                  onMethodSelect(method.id);
                  
                  // Auto-start scanning for certain methods
                  if (method.id === 'rfid') {
                    startRFIDScan();
                  } else if (method.id === 'barcode') {
                    startBarcodeScan();
                  }
                }
              }}
              disabled={!isAvailable}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `border-${method.color}-600 bg-${method.color}-50`
                  : 'border-gray-300 bg-white hover:border-gray-400'
              } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className={`h-6 w-6 mb-2 ${isSelected ? `text-${method.color}-600` : 'text-gray-600'}`} />
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{method.name}</h3>
              <p className="text-xs text-gray-500 mb-2">{method.description}</p>
              {isAvailable ? (
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                  Available
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {method.id === 'scale' ? 'Coming Soon' : 'Not Available'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* QR Code Scanner */}
      {selectedMethod === 'qr' && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6">
          <div id="qr-reader" className="w-full max-w-md mx-auto"></div>
          {isScanningQR && (
            <div className="text-center mt-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Point camera at QR code...</p>
            </div>
          )}
          <button
            onClick={stopQRScanner}
            className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Stop Scanning
          </button>
        </div>
      )}

      {/* Barcode Scanner */}
      {selectedMethod === 'barcode' && (
        <div className="border-2 border-dashed border-green-300 rounded-lg p-6">
          <div id="barcode-reader" className="w-full max-w-md mx-auto"></div>
          {isScanningBarcode && (
            <div className="text-center mt-4">
              <Loader2 className="h-5 w-5 animate-spin text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Point camera at barcode...</p>
            </div>
          )}
        </div>
      )}

      {/* RFID/NFC Scanner */}
      {selectedMethod === 'rfid' && (
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center">
          <Radio className="h-16 w-16 mx-auto mb-4 text-purple-600" />
          {isScanningRFID ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Scan</h3>
              <p className="text-gray-600 mb-4">Tap your RFID tag or NFC card to the device</p>
              <button
                onClick={() => setIsScanningRFID(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">RFID/NFC Scanner</h3>
              <p className="text-gray-600 mb-4">Tap to start scanning</p>
              <button
                onClick={startRFIDScan}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Start RFID Scan
              </button>
            </>
          )}
        </div>
      )}

      {/* IoT Scale Integration (Placeholder) */}
      {selectedMethod === 'scale' && (
        <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center">
          <Scale className="h-16 w-16 mx-auto mb-4 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">IoT Scale Integration</h3>
          <p className="text-gray-600 mb-4">
            Connect to a digital scale via Bluetooth or USB to automatically capture weight readings
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <Zap className="h-4 w-4 inline mr-2" />
            This feature requires scale API integration. Contact your administrator to set up.
          </div>
        </div>
      )}

      {/* Voice Input (Placeholder) */}
      {selectedMethod === 'voice' && (
        <div className="border-2 border-dashed border-pink-300 rounded-lg p-6 text-center">
          <Mic className="h-16 w-16 mx-auto mb-4 text-pink-600" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Input</h3>
          <p className="text-gray-600 mb-4">Speak batch details and we'll transcribe them</p>
          <button
            onClick={() => {
              // Voice recognition would go here
              alert('Voice input feature coming soon!');
            }}
            className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            Start Voice Input
          </button>
        </div>
      )}
    </div>
  );
}

