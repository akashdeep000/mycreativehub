import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Pipette } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  recentColors?: string[];
  onAddToRecent?: (color: string) => void;
}

interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export function ColorPicker({ value, onChange, recentColors = [], onAddToRecent }: ColorPickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const [hsv, setHsv] = useState<HSV>({ h: 0, s: 100, v: 100 });
  const [hexInput, setHexInput] = useState(value || '#ffffff');
  const [rgbInput, setRgbInput] = useState({ r: 255, g: 255, b: 255 });
  const [hslInput, setHslInput] = useState({ h: 0, s: 100, l: 50 });
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);

  const saturationRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Check for EyeDropper API support
  useEffect(() => {
    setEyeDropperSupported('EyeDropper' in window);
  }, []);

  // Initialize color from prop value
  useEffect(() => {
    if (value && value !== hexInput) {
      setHexInput(value);
      const rgb = hexToRgb(value);
      if (rgb) {
        const newHsv = rgbToHsv(rgb);
        const newHsl = rgbToHsl(rgb);
        setHsv(newHsv);
        setRgbInput(rgb);
        setHslInput(newHsl);
      }
    }
  }, [value]);

  // Color conversion utilities
  const hexToRgb = (hex: string): RGB | null => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const expanded = cleanHex.split('').map(char => char + char).join('');
      const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHex = (rgb: RGB): string => {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  };

  const rgbToHsv = (rgb: RGB): HSV => {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    if (diff !== 0) {
      switch (max) {
        case r: h = ((g - b) / diff) % 6; break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : Math.round((diff / max) * 100);
    const v = Math.round(max * 100);

    return { h, s, v };
  };

  const hsvToRgb = (hsv: HSV): RGB => {
    const h = hsv.h / 60;
    const s = hsv.s / 100;
    const v = hsv.v / 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 1) { r = c; g = x; b = 0; }
    else if (h >= 1 && h < 2) { r = x; g = c; b = 0; }
    else if (h >= 2 && h < 3) { r = 0; g = c; b = x; }
    else if (h >= 3 && h < 4) { r = 0; g = x; b = c; }
    else if (h >= 4 && h < 5) { r = x; g = 0; b = c; }
    else if (h >= 5 && h < 6) { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  const rgbToHsl = (rgb: RGB): HSL => {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;

    const l = sum / 2;

    let h = 0;
    let s = 0;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;
      
      switch (max) {
        case r: h = ((g - b) / diff) + (g < b ? 6 : 0); break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const hslToRgb = (hsl: HSL): RGB => {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  const updateColor = useCallback((newHsv: HSV) => {
    setHsv(newHsv);
    const rgb = hsvToRgb(newHsv);
    const hex = rgbToHex(rgb);
    const hsl = rgbToHsl(rgb);
    
    setRgbInput(rgb);
    setHslInput(hsl);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  // Handle saturation/lightness square interaction
  const handleSaturationMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSaturationMove(e);
  };

  const handleSaturationMove = (e: React.MouseEvent) => {
    if (saturationRef.current) {
      const rect = saturationRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      
      const s = (x / rect.width) * 100;
      const v = ((rect.height - y) / rect.height) * 100;
      
      updateColor({ ...hsv, s, v });
    }
  };

  // Handle hue slider interaction
  const handleHueMouseDown = (e: React.MouseEvent) => {
    setIsDraggingHue(true);
    handleHueMove(e);
  };

  const handleHueMove = (e: React.MouseEvent) => {
    if (hueRef.current) {
      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const h = (x / rect.width) * 360;
      
      updateColor({ ...hsv, h });
    }
  };

  // Mouse move handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSaturationMove(e as any);
      }
      if (isDraggingHue) {
        handleHueMove(e as any);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsDraggingHue(false);
    };

    if (isDragging || isDraggingHue) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDraggingHue, hsv]);

  // Input handlers with validation
  const isValidHex = (hex: string): boolean => {
    const cleanHex = hex.replace('#', '');
    return /^([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(cleanHex);
  };

  const normalizeHex = (hex: string): string => {
    let cleanHex = hex.replace('#', '').toLowerCase();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    return `#${cleanHex}`;
  };

  const handleHexChange = (newHex: string) => {
    setHexInput(newHex);
    
    if (isValidHex(newHex)) {
      const normalizedHex = normalizeHex(newHex);
      const rgb = hexToRgb(normalizedHex);
      if (rgb) {
        const newHsv = rgbToHsv(rgb);
        const newHsl = rgbToHsl(rgb);
        setHsv(newHsv);
        setRgbInput(rgb);
        setHslInput(newHsl);
        onChange(normalizedHex);
      }
    }
  };

  const handleHexBlur = () => {
    if (isValidHex(hexInput)) {
      const normalizedHex = normalizeHex(hexInput);
      setHexInput(normalizedHex);
      onChange(normalizedHex);
    }
  };

  const handleRgbChange = (component: keyof RGB, value: number) => {
    const newRgb = { ...rgbInput, [component]: Math.max(0, Math.min(255, value)) };
    setRgbInput(newRgb);
    const hex = rgbToHex(newRgb);
    const newHsv = rgbToHsv(newRgb);
    const newHsl = rgbToHsl(newRgb);
    setHsv(newHsv);
    setHslInput(newHsl);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHslChange = (component: keyof HSL, value: number) => {
    let newHsl = { ...hslInput };
    if (component === 'h') {
      newHsl.h = Math.max(0, Math.min(360, value));
    } else {
      newHsl[component] = Math.max(0, Math.min(100, value));
    }
    setHslInput(newHsl);
    const newRgb = hslToRgb(newHsl);
    const hex = rgbToHex(newRgb);
    const newHsv = rgbToHsv(newRgb);
    setRgbInput(newRgb);
    setHsv(newHsv);
    setHexInput(hex);
    onChange(hex);
  };

  // EyeDropper functionality
  const handleEyeDropper = async () => {
    if (!eyeDropperSupported) return;
    
    try {
      // @ts-ignore - EyeDropper is not in TypeScript definitions yet
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      handleHexChange(result.sRGBHex);
      if (onAddToRecent) {
        onAddToRecent(result.sRGBHex);
      }
    } catch (e) {
      // User cancelled or error occurred
      console.log('EyeDropper cancelled or failed');
    }
  };

  const currentColor = rgbToHex(hsvToRgb(hsv));

  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Live Preview */}
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-inner"
          style={{ backgroundColor: currentColor }}
        />
        <div className="text-sm font-medium">Current Color</div>
        {eyeDropperSupported && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEyeDropper}
            className="ml-auto"
          >
            <Pipette className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Saturation/Lightness Square */}
      <div className="relative">
        <div
          ref={saturationRef}
          className="w-full h-48 rounded-lg cursor-crosshair relative overflow-hidden"
          style={{
            background: `hsl(${hsv.h}, 100%, 50%)`
          }}
          onMouseDown={handleSaturationMouseDown}
        >
          {/* White to transparent gradient (saturation) */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, white, transparent)'
            }}
          />
          {/* Transparent to black gradient (lightness) */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, black, transparent)'
            }}
          />
          {/* Cursor */}
          <div
            className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${hsv.s}%`,
              top: `${100 - hsv.v}%`,
              backgroundColor: currentColor
            }}
          />
        </div>
      </div>

      {/* Hue Slider */}
      <div className="relative">
        <div
          ref={hueRef}
          className="w-full h-6 rounded-lg cursor-pointer"
          style={{
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
          }}
          onMouseDown={handleHueMouseDown}
        >
          {/* Hue cursor */}
          <div
            className="absolute w-4 h-6 border-2 border-white rounded-sm shadow-lg transform -translate-x-1/2"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`
            }}
          />
        </div>
      </div>

      <Separator />

      {/* Color Input Fields */}
      <div className="space-y-3">
        {/* HEX Input */}
        <div className="flex items-center gap-2">
          <Label className="w-12 text-xs font-medium">HEX</Label>
          <div className="flex-1">
            <Input
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              onBlur={handleHexBlur}
              className={`font-mono text-sm ${!isValidHex(hexInput) && hexInput.length > 0 ? 'border-red-300 focus:border-red-500' : ''}`}
              placeholder="#ffffff"
            />
            {!isValidHex(hexInput) && hexInput.length > 0 && (
              <div className="text-xs text-red-500 mt-1">Invalid hex format</div>
            )}
          </div>
        </div>

        {/* RGB Inputs */}
        <div className="flex items-center gap-2">
          <Label className="w-12 text-xs font-medium">RGB</Label>
          <div className="flex-1 flex gap-1">
            <Input
              type="number"
              value={rgbInput.r}
              onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
              min="0"
              max="255"
              className="w-full text-xs"
            />
            <Input
              type="number"
              value={rgbInput.g}
              onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
              min="0"
              max="255"
              className="w-full text-xs"
            />
            <Input
              type="number"
              value={rgbInput.b}
              onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
              min="0"
              max="255"
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* HSL Inputs */}
        <div className="flex items-center gap-2">
          <Label className="w-12 text-xs font-medium">HSL</Label>
          <div className="flex-1 flex gap-1">
            <Input
              type="number"
              value={hslInput.h}
              onChange={(e) => handleHslChange('h', parseInt(e.target.value) || 0)}
              min="0"
              max="360"
              className="w-full text-xs"
            />
            <Input
              type="number"
              value={hslInput.s}
              onChange={(e) => handleHslChange('s', parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-full text-xs"
            />
            <Input
              type="number"
              value={hslInput.l}
              onChange={(e) => handleHslChange('l', parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <>
          <Separator />
          <div>
            <Label className="text-xs font-medium mb-2 block">Recent Colors</Label>
            <div className="flex gap-2 flex-wrap">
              {recentColors.slice(0, 8).map((color, index) => (
                <button
                  key={index}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => handleHexChange(color)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}