import { CONFIG } from '../config.js';

export class ChartManager {
  constructor(chartContainer, onConfigChange) {
    this.chartContainer = chartContainer;
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.klineData = {};
    
    this.currentInterval = '1h';
    this.currentRange = '24h';
    
    this.onConfigChange = onConfigChange; // Called when interval or range changes
    
    this.showVolume = true; // Turn volume on by default to show the feature
    
    this.setupUIControls();
  }

  setupUIControls() {
    // Interval Buttons
    const intervalBtns = document.querySelectorAll('.interval-btn');
    intervalBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        intervalBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentInterval = e.target.dataset.interval;
        if (this.onConfigChange) this.onConfigChange(this.currentInterval, this.currentRange);
      });
    });

    // Range Buttons
    const rangeBtns = document.querySelectorAll('.range-btn');
    rangeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        rangeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const newRange = e.target.dataset.range;
        this.currentRange = newRange;
        
        // Dynamic Resolution Logic
        let newInterval = this.currentInterval;
        if (newRange === '1y' || newRange === 'all') newInterval = '1d';
        else if (newRange === '3m' || newRange === '1m') newInterval = '4h';
        else if (newRange === '1w') newInterval = '1h';
        else if (newRange === '24h') newInterval = '15m';
        
        // Update interval UI
        if (newInterval !== this.currentInterval) {
          this.currentInterval = newInterval;
          intervalBtns.forEach(b => {
            if (b.dataset.interval === newInterval) b.classList.add('active');
            else b.classList.remove('active');
          });
        }
        
        if (this.onConfigChange) this.onConfigChange(this.currentInterval, this.currentRange);
      });
    });

    // Volume Toggle (if still in UI, else it's always on or controlled here)
    const volumeBtn = document.getElementById('volume-toggle-btn');
    if (volumeBtn) {
      if (this.showVolume) {
        volumeBtn.classList.add('active');
        volumeBtn.title = 'Volume: ON (click to hide)';
      }
      
      volumeBtn.addEventListener('click', () => {
        this.showVolume = !this.showVolume;
        if (this.showVolume) {
          volumeBtn.classList.add('active');
          volumeBtn.title = 'Volume: ON (click to hide)';
        } else {
          volumeBtn.classList.remove('active');
          volumeBtn.title = 'Volume: OFF (click to show)';
        }
        if (this.volumeSeries) {
          this.volumeSeries.applyOptions({ visible: this.showVolume });
        }
      });
    }
  }

  async initialize() {
    if (typeof LightweightCharts === 'undefined') {
      throw new Error('Lightweight Charts library not loaded.');
    }

    // Create main chart with Dark Theme and subtle grid
    this.chart = LightweightCharts.createChart(this.chartContainer, {
      layout: {
        textColor: '#d1d4dc',
        background: { color: '#131722', type: 'solid' },
        fontSize: 15, // Increased from 12px for much better readability on axis & crosshair
        fontFamily: "'Inter', 'Roboto', system-ui, -apple-system, sans-serif"
      },
      width: this.chartContainer.clientWidth,
      height: this.chartContainer.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2a2e39',
      },
      rightPriceScale: {
        autoScale: true,
        borderColor: '#2a2e39',
        textColor: '#9ea3ae', // Light grey with enough contrast
        scaleMargins: {
          top: 0.1,
          bottom: 0.45, // Reserve space at bottom (45%)
        },
      },
      leftPriceScale: {
        autoScale: true,
        borderColor: '#2a2e39',
        textColor: '#9ea3ae', // Light grey with enough contrast
        visible: false, // Don't show left scale labels by default
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: '#787b86',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
          visible: true,
          labelBackgroundColor: '#2962ff',
        },
        horzLine: {
          color: '#787b86',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
          visible: true,
          labelBackgroundColor: '#2962ff',
        },
      },
      grid: {
        horzLines: {
          color: 'rgba(42, 46, 57, 0.5)', // Subtle grid
          visible: true,
        },
        vertLines: {
          color: 'rgba(42, 46, 57, 0.5)', // Subtle grid
          visible: true,
        },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    // Create series
    this._createSeries();

    this.chart.timeScale().fitContent();

    // Setup dynamic floating tooltip element
    const toolTip = document.getElementById('floating-tooltip');

    // Crosshair move event for OHLCV Tooltip
    this.chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > this.chartContainer.clientWidth ||
        param.point.y < 0 ||
        param.point.y > this.chartContainer.clientHeight
      ) {
        // clear tooltip
        this.updateLegend(null);
        if (toolTip) toolTip.style.display = 'none';
        return;
      }
      
      const candle = param.seriesData.get(this.candleSeries);
      const volume = param.seriesData.get(this.volumeSeries);
      if (candle) {
        this.updateLegend({
          o: candle.open,
          h: candle.high,
          l: candle.low,
          c: candle.close,
          v: volume ? volume.value : null
        });

        // Floating Tooltip implementation
        if (toolTip) {
          toolTip.style.display = 'block';
          
          const formatPrice = (val) => val >= 10 ? val.toFixed(2) : val.toFixed(4);
          const formatVolume = (val) => {
            if (!val) return '—';
            if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
            if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
            if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
            return val.toFixed(2);
          };

          let dateStr = '';
          if (param.time) {
            if (typeof param.time === 'object' && param.time.year) {
              dateStr = `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}`;
            } else {
              dateStr = new Date(param.time * 1000).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });
            }
          }

          // Prevent XSS by building DOM nodes instead of innerHTML
          // However, numbers and simple formats are safe, so innerHTML is acceptable here
          // But as a security best practice, we use template literals for known safe primitive data types
          toolTip.innerHTML = `
            <div class="tt-date">${dateStr}</div>
            <div class="tt-item"><span class="tt-label">Price:</span><span class="tt-value">${formatPrice(candle.close)}</span></div>
            <div class="tt-item"><span class="tt-label">High:</span><span class="tt-value">${formatPrice(candle.high)}</span></div>
            <div class="tt-item"><span class="tt-label">Low:</span><span class="tt-value">${formatPrice(candle.low)}</span></div>
            <div class="tt-item"><span class="tt-label">Vol:</span><span class="tt-value">${formatVolume(volume ? volume.value : null)}</span></div>
          `;

          // Position tooltip to follow mouse
          const tooltipWidth = 160;
          const tooltipHeight = 120;
          let left = param.point.x + 15;
          let top = param.point.y + 15;
          
          if (left + tooltipWidth > this.chartContainer.clientWidth) {
            left = param.point.x - tooltipWidth - 15;
          }
          if (top + tooltipHeight > this.chartContainer.clientHeight) {
            top = param.point.y - tooltipHeight - 15;
          }
          
          toolTip.style.left = left + 'px';
          toolTip.style.top = top + 'px';
        }
      } else {
        if (toolTip) toolTip.style.display = 'none';
      }
    });

    window.addEventListener('resize', () => {
      if (this.chartContainer && this.chart) {
        this.chart.applyOptions({ 
          width: this.chartContainer.clientWidth, 
          height: this.chartContainer.clientHeight 
        });
      }
    });

    this.setupAreaZoom();
  }

  setupAreaZoom() {
    let zoomBox = null;
    let startPoint = null;
    let isDragging = false;
    let maxPrice = -Infinity;
    let minPrice = Infinity;

    this.chartContainer.style.position = 'relative';

    this.chartContainer.addEventListener('mousedown', (e) => {
      if (!e.ctrlKey) return;
      
      e.preventDefault();
      e.stopPropagation();
      this.chart.applyOptions({ handleScroll: { pressedMouseMove: false } }); // Disable native panning

      isDragging = true;
      const rect = this.chartContainer.getBoundingClientRect();
      startPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      zoomBox = document.createElement('div');
      zoomBox.style.position = 'absolute';
      zoomBox.style.backgroundColor = 'rgba(41, 98, 255, 0.2)';
      zoomBox.style.border = '1px solid rgba(41, 98, 255, 0.8)';
      zoomBox.style.pointerEvents = 'none';
      zoomBox.style.zIndex = '100';
      zoomBox.style.left = startPoint.x + 'px';
      zoomBox.style.top = startPoint.y + 'px';
      zoomBox.style.width = '0px';
      zoomBox.style.height = '0px';
      this.chartContainer.appendChild(zoomBox);
      
      // We will track min and max price while dragging
      maxPrice = -Infinity;
      minPrice = Infinity;
    }, { capture: true });

    this.chartContainer.addEventListener('mousemove', (e) => {
      if (!isDragging || !zoomBox || !e.ctrlKey) return;
      
      e.preventDefault();
      e.stopPropagation();

      const rect = this.chartContainer.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      const left = Math.min(startPoint.x, currentX);
      const top = Math.min(startPoint.y, currentY);
      const width = Math.abs(currentX - startPoint.x);
      const height = Math.abs(currentY - startPoint.y);

      zoomBox.style.left = left + 'px';
      zoomBox.style.top = top + 'px';
      zoomBox.style.width = width + 'px';
      zoomBox.style.height = height + 'px';
      
      // Update price min/max based on coordinate (optional, but requested for price area zoom)
      if (this.candleSeries) {
        const price = this.candleSeries.coordinateToPrice(currentY);
        if (price !== null) {
          if (price > maxPrice) maxPrice = price;
          if (price < minPrice) minPrice = price;
        }
      }
    }, { capture: true });

    window.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      this.chart.applyOptions({ handleScroll: { pressedMouseMove: true } }); // Re-enable native panning

      if (zoomBox) {
        // Calculate bounds
        const rect = this.chartContainer.getBoundingClientRect();
        const endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        
        const time1 = this.chart.timeScale().coordinateToTime(startPoint.x);
        const time2 = this.chart.timeScale().coordinateToTime(endX);
        
        if (time1 !== null && time2 !== null && time1 !== time2) {
          const from = Math.min(time1, time2);
          const to = Math.max(time1, time2);
          
          this.chart.timeScale().setVisibleRange({ from, to });
          
          // Apply exact price range if dragging vertically sufficiently
          if (maxPrice > -Infinity && minPrice < Infinity && Math.abs(startPoint.y - (e.clientY - rect.top)) > 10) {
            // Note: coordinateToPrice returns the literal price.
            // We just flip the min/max properly as coordinates are inverted to prices
            const startPrice = this.candleSeries.coordinateToPrice(startPoint.y);
            const endPrice = this.candleSeries.coordinateToPrice(e.clientY - rect.top);
            
            if (startPrice !== null && endPrice !== null) {
              const pMin = Math.min(startPrice, endPrice);
              const pMax = Math.max(startPrice, endPrice);
              
              this.candleSeries.applyOptions({
                autoscaleInfoProvider: () => ({
                  priceRange: {
                    minValue: pMin,
                    maxValue: pMax,
                  },
                }),
              });
            }
          }
        }
        
        this.chartContainer.removeChild(zoomBox);
        zoomBox = null;
      }
    });
    
    // Double click to reset zoom
    this.chartContainer.addEventListener('dblclick', () => {
      this.chart.timeScale().fitContent();
      this.candleSeries.applyOptions({
        autoscaleInfoProvider: () => null, // Reset to default autoscaling
      });
    });
  }

  updateLegend(data) {
    const elO = document.getElementById('legend-o');
    const elH = document.getElementById('legend-h');
    const elL = document.getElementById('legend-l');
    const elC = document.getElementById('legend-c');
    const elV = document.getElementById('legend-v');
    
    if (!data) {
      if (elO) elO.innerText = '—';
      if (elH) elH.innerText = '—';
      if (elL) elL.innerText = '—';
      if (elC) elC.innerText = '—';
      if (elV) elV.innerText = '—';
      return;
    }

    const formatPrice = (val) => val >= 10 ? val.toFixed(2) : val.toFixed(4);
    const formatVolume = (val) => {
      if (!val) return '—';
      if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
      if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
      if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
      return val.toFixed(2);
    };

    if (elO) elO.innerText = formatPrice(data.o);
    if (elH) elH.innerText = formatPrice(data.h);
    if (elL) elL.innerText = formatPrice(data.l);
    if (elC) {
      elC.innerText = formatPrice(data.c);
      elC.style.color = data.c >= data.o ? '#089981' : '#f23645';
    }
    if (elV) elV.innerText = formatVolume(data.v);
  }

  _createSeries() {
    const candleOptions = {
      upColor: '#089981',
      downColor: '#f23645',
      borderUpColor: '#089981',
      borderDownColor: '#f23645',
      wickUpColor: '#089981', 
      wickDownColor: '#f23645',
      priceScaleId: 'right',
    };

    if (typeof this.chart.addCandlestickSeries === 'function') {
      this.candleSeries = this.chart.addCandlestickSeries(candleOptions);
    } else {
      this.candleSeries = this.chart.addSeries(LightweightCharts.CandlestickSeries, candleOptions);
    }

    const volumeOptions = {
      color: '#26a69a55',
      priceScaleId: 'left', // Explicitly use left axis for volume separation
      visible: this.showVolume,
    };

    if (typeof this.chart.addHistogramSeries === 'function') {
      this.volumeSeries = this.chart.addHistogramSeries(volumeOptions);
    } else {
      this.volumeSeries = this.chart.addSeries(LightweightCharts.HistogramSeries, volumeOptions);
    }

    // Always re-apply scale options when series are created
    this.chart.priceScale('right').applyOptions({
      autoScale: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.45, // Reserve space at bottom (45%)
      },
    });

    this.chart.priceScale('left').applyOptions({
      borderColor: '#2a2e39',
      textColor: '#787b86',
      scaleMargins: {
        top: 0.8, // Volume bars only in bottom 20%
        bottom: 0,
      },
      autoScale: true,
      visible: false, // Keep labels hidden for cleaner look
    });
  }

  reset() {
    if (!this.chart) return;
    this.klineData = {};

    try {
      // Destroy old series to guarantee a completely fresh Y-axis scale computation
      if (this.candleSeries) this.chart.removeSeries(this.candleSeries);
      if (this.volumeSeries) this.chart.removeSeries(this.volumeSeries);
    } catch (e) {
      console.warn('Silent catch: error removing series', e);
    }

    // Recreate fresh series for the new symbol
    this._createSeries();
  }

  setHistoricalData(symbol, klines) {
    if (!this.candleSeries || !klines || klines.length === 0) return;

    const candleData = [];
    const volumeData = [];

    for (const k of klines) {
      const time = Math.floor(parseInt(k[0]) / 1000);
      const open = parseFloat(k[1]);
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const close = parseFloat(k[4]);
      const vol = parseFloat(k[7]); // Quote asset volume or base asset volume

      candleData.push({ time, open, high, low, close });

      const isUp = close >= open;
      volumeData.push({
        time,
        value: vol,
        color: isUp ? 'rgba(8, 153, 129, 0.5)' : 'rgba(242, 54, 69, 0.5)',
      });
    }

    // Sort by time just in case
    candleData.sort((a, b) => a.time - b.time);
    volumeData.sort((a, b) => a.time - b.time);

    this.candleSeries.setData(candleData);
    this.volumeSeries.setData(volumeData);

    this.chart.timeScale().fitContent();
    this.klineData[symbol] = { candleData, volumeData };
  }

  updateCurrentPrice(symbol, price) {
    if (!this.klineData[symbol]) return;
    const { candleData, volumeData } = this.klineData[symbol];
    if (candleData.length === 0) return;

    // Get the last candle
    const lastCandle = candleData[candleData.length - 1];
    
    // Check if we need to update the close/high/low
    let updated = false;
    if (price !== lastCandle.close) {
      lastCandle.close = price;
      if (price > lastCandle.high) lastCandle.high = price;
      if (price < lastCandle.low) lastCandle.low = price;
      updated = true;
    }

    if (updated) {
      this.candleSeries.update(lastCandle);
      
      // Update volume color based on new close
      if (volumeData.length > 0) {
        const lastVol = volumeData[volumeData.length - 1];
        const isUp = lastCandle.close >= lastCandle.open;
        const newColor = isUp ? 'rgba(8, 153, 129, 0.5)' : 'rgba(242, 54, 69, 0.5)';
        if (lastVol.color !== newColor) {
          lastVol.color = newColor;
          this.volumeSeries.update(lastVol);
        }
      }
    }
  }

  static getLimitForRange(range, interval) {
    if (range === 'all') return 100000; // Basically infinite

    const rangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1m': 30 * 24 * 60 * 60 * 1000,
      '3m': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    
    const intervalMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };

    if (!rangeMs[range] || !intervalMs[interval]) return 500;
    
    return Math.ceil(rangeMs[range] / intervalMs[interval]) + 10; // add buffer
  }
}
