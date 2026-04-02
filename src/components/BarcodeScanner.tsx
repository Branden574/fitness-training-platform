'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onResult: (product: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
    servingUnit: string;
  }) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const detectedRef = useRef(false);
  const quaggaRef = useRef<any>(null);

  const stopCamera = useCallback(() => {
    // Stop quagga if running
    if (quaggaRef.current) {
      try { quaggaRef.current.stop(); } catch {}
      quaggaRef.current = null;
    }
    // Stop raw video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (detectedRef.current) return;
    detectedRef.current = true;
    setLookingUp(true);
    setError(null);

    try {
      // Try 1: Open Food Facts
      try {
        const offRes = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
          { signal: AbortSignal.timeout(5000) }
        );
        const offData = await offRes.json();

        if (offData.status === 1 && offData.product?.product_name) {
          const p = offData.product;
          const n = p.nutriments || {};
          const servingSize = p.serving_quantity || 100;
          const ratio = servingSize / 100;
          const cal100 = n['energy-kcal_100g'] || (n.energy_100g || 0) / 4.184;

          if (cal100 > 0 || n.proteins_100g > 0) {
            onResult({
              name: p.product_name,
              calories: Math.round(cal100 * ratio),
              protein: Math.round((n.proteins_100g || 0) * ratio * 10) / 10,
              carbs: Math.round((n.carbohydrates_100g || 0) * ratio * 10) / 10,
              fat: Math.round((n.fat_100g || 0) * ratio * 10) / 10,
              servingSize,
              servingUnit: p.serving_quantity ? 'serving' : 'g',
            });
            stopCamera();
            return;
          }
        }
      } catch {}

      // Try 2: USDA FoodData Central (search by UPC/GTIN)
      try {
        const usdaKey = 'DEMO_KEY'; // Server-side key is used for regular search; client-side uses DEMO_KEY for barcode
        const usdaRes = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${barcode}&dataType=Branded&pageSize=3`,
          { signal: AbortSignal.timeout(6000) }
        );
        const usdaData = await usdaRes.json();

        if (usdaData.foods && usdaData.foods.length > 0) {
          const food = usdaData.foods[0];
          const nutrients = food.foodNutrients || [];
          const getVal = (id: number) => nutrients.find((n: any) => n.nutrientId === id)?.value || 0;
          const servingSize = food.servingSize || 100;
          const ratio = servingSize / 100;

          onResult({
            name: food.description || 'Unknown Product',
            calories: Math.round(getVal(1008) * ratio),
            protein: Math.round(getVal(1003) * ratio * 10) / 10,
            carbs: Math.round(getVal(1005) * ratio * 10) / 10,
            fat: Math.round(getVal(1004) * ratio * 10) / 10,
            servingSize,
            servingUnit: food.servingSizeUnit || 'g',
          });
          stopCamera();
          return;
        }
      } catch {}

      // Try 3: Use our own food search API as last resort
      try {
        const searchRes = await fetch(`/api/food-search?q=${barcode}&source=all`);
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
          const food = searchData.results[0];
          onResult({
            name: food.name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            servingSize: food.servingSize,
            servingUnit: food.servingUnit,
          });
          stopCamera();
          return;
        }
      } catch {}

      // All sources failed
      setError(`Product not found for barcode ${barcode}. Try searching by name instead.`);
      detectedRef.current = false;
    } catch {
      setError('Failed to look up product. Check your connection.');
      detectedRef.current = false;
    } finally {
      setLookingUp(false);
    }
  }, [onResult, stopCamera]);

  const startCamera = useCallback(async () => {
    setError(null);
    detectedRef.current = false;

    const hasBarcodeDetector = 'BarcodeDetector' in window;

    if (hasBarcodeDetector) {
      // Use native BarcodeDetector (Chrome, Edge)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
        }
      } catch {
        setError('Camera access denied. Enter barcode manually below.');
      }
    } else {
      // Use Quagga2 fallback (Safari, Firefox)
      try {
        const Quagga = (await import('@ericblade/quagga2')).default;
        quaggaRef.current = Quagga;

        if (!scannerRef.current) return;

        Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              facingMode: 'environment',
              width: { min: 640, ideal: 1280 },
              height: { min: 480, ideal: 720 },
            },
          },
          decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'],
          },
          locate: true,
          frequency: 5,
        }, (err: Error | null) => {
          if (err) {
            setError('Camera access denied. Enter barcode manually below.');
            return;
          }
          Quagga.start();
          setScanning(true);
        });

        Quagga.onDetected((result: any) => {
          if (result?.codeResult?.code && !detectedRef.current) {
            Quagga.stop();
            lookupBarcode(result.codeResult.code);
          }
        });
      } catch {
        setError('Could not initialize scanner. Enter barcode manually below.');
      }
    }
  }, [lookupBarcode]);

  // BarcodeDetector polling (for native API)
  useEffect(() => {
    if (!scanning || !videoRef.current || !('BarcodeDetector' in window)) return;

    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
    });

    const interval = setInterval(async () => {
      if (!videoRef.current || detectedRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          clearInterval(interval);
          lookupBarcode(barcodes[0].rawValue);
        }
      } catch {
        // Occasional detection failures are normal
      }
    }, 400);

    return () => clearInterval(interval);
  }, [scanning, lookupBarcode]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleManualLookup = () => {
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] sm:p-4">
      <div className="bg-white dark:bg-[#1a1f2e] rounded-t-2xl sm:rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2a3042]">
          <h3 className="font-semibold text-gray-900 dark:text-white">Scan Barcode</h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Camera View */}
          <div ref={scannerRef} className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            {/* Native video element (BarcodeDetector path) */}
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

            {!scanning && !lookingUp && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <Camera className="w-12 h-12 text-gray-500 mb-3" />
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Start Camera
                </button>
                <p className="text-xs text-gray-500 mt-2">Works on all browsers</p>
              </div>
            )}

            {scanning && !lookingUp && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-40 border-2 border-indigo-400/60 rounded-xl" />
                <p className="absolute bottom-4 text-white text-xs bg-black/50 px-3 py-1 rounded-full">
                  Point at barcode
                </p>
              </div>
            )}

            {lookingUp && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                <p className="text-white text-sm">Looking up product...</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg">
              {error}
            </p>
          )}

          {/* Manual barcode entry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Or enter barcode manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                placeholder="e.g. 5901234123457"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={handleManualLookup}
                disabled={!manualBarcode.trim() || lookingUp}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Look Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
