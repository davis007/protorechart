// チャート描画制御クラス
class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chartData = [];           // 表示用データ（前日15本+当日1本）
        this.additionalData = [];      // 追加データ（当日の残り）
        this.historicalData = [];      // 過去90日データ（インジケーター計算用）
        this.fullData = [];            // 全データ（過去90日+表示データ）
        this.currentStep = 0;
        this.chart = null;
        this.candleSeries = null;

        // インジケーターシリーズ
        this.indicators = {
            ma5: null,
            ma25: null,
            bbUpper2: null,    // σ2上限
            bbUpper1: null,    // σ1上限
            bbMiddle: null,    // 中央線
            bbLower1: null,    // σ1下限
            bbLower2: null,    // σ2下限
            macdChart: null,
            macdHistogram: null,
            macdLine: null,
            macdSignal: null,
            rsiChart: null,
            rsiLine: null,
            rciChart: null,
            rci9Line: null,
            rci26Line: null
        };

        // インジケーター表示状態
        this.indicatorVisible = {
            MA5: true,
            MA25: true,
            BB: false,
            MACD: false,
            RSI: false,
            RCI: false
        };
    }

    // チャートの初期化（TradingView Lightweight Charts）
    initChart() {
        // Lightweight Chartsライブラリが読み込まれているかチェック
        if (typeof LightweightCharts === 'undefined') {
            console.error('Lightweight Charts library is not loaded');
            return;
        }

        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Chart container not found:', this.containerId);
            return;
        }

        try {
            this.chart = LightweightCharts.createChart(container, {
                layout: {
                    background: { color: '#000000' },
                    textColor: '#D1D4DC',
                },
                grid: {
                    vertLines: { color: '#2B2B43' },
                    horzLines: { color: '#2B2B43' },
                },
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
                timeScale: {
                    borderColor: '#485c7b',
                    timeVisible: true,
                    secondsVisible: false,
                    rightOffset: 50, // 右側に余白を作って最新ローソクを中央寄りに
                    barSpacing: 8,   // ローソク足の間隔を調整
                },
            });

            this.candleSeries = this.chart.addCandlestickSeries({
                upColor: '#26a69a',
                borderUpColor: '#26a69a',
                wickUpColor: '#26a69a',
                downColor: '#ef5350',
                borderDownColor: '#ef5350',
                wickDownColor: '#ef5350',
            });

            // インジケーターシリーズの初期化
            this.initializeIndicators();

            console.log('Chart initialized successfully');
        } catch (error) {
            console.error('Error initializing chart:', error);
        }
    }



    // データの読み込み（Lightweight Charts形式に変換）
    loadData(chartData) {
        // 過去データの変換（インジケーター計算用）
        this.historicalData = (chartData.historical_prices || []).map(item => ({
            time: Math.floor(new Date(item.time).getTime() / 1000), // Unixタイムスタンプ（秒）
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));

        // 表示用データの変換
        this.chartData = (chartData.prices || []).map(item => ({
            time: Math.floor(new Date(item.time).getTime() / 1000), // Unixタイムスタンプ（秒）
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));

        // 追加データの変換
        if (chartData.additional_prices) {
            this.additionalData = chartData.additional_prices.map(item => ({
                time: Math.floor(new Date(item.time).getTime() / 1000), // Unixタイムスタンプ（秒）
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close
            }));
        }

        // 全データを結合（インジケーター計算用）
        this.fullData = [...this.historicalData, ...this.chartData];

        // 過去データがない場合は表示データのみを使用
        if (this.historicalData.length === 0) {
            console.warn('No historical data available, using chart data only for indicators');
            this.fullData = [...this.chartData];
        }

        console.log('Data loaded:', {
            historical: this.historicalData.length,
            display: this.chartData.length,
            additional: this.additionalData.length,
            full: this.fullData.length
        });

        // デバッグ：データ範囲を確認
        if (this.fullData.length > 0) {
            console.log('Full data range:', {
                first: new Date(this.fullData[0].time * 1000).toLocaleString(),
                last: new Date(this.fullData[this.fullData.length - 1].time * 1000).toLocaleString()
            });
        }
        if (this.chartData.length > 0) {
            console.log('Chart data range:', {
                first: new Date(this.chartData[0].time * 1000).toLocaleString(),
                last: new Date(this.chartData[this.chartData.length - 1].time * 1000).toLocaleString()
            });
        }

        // 初期データをチャートに設定
        if (this.candleSeries && this.chartData.length > 0) {
            this.candleSeries.setData(this.chartData);
            this.updateIndicators();
        }
    }

    // 次の5分足を追加（リアルタイム更新）
    addNextCandle() {
        if (this.additionalData.length > 0) {
            // 追加データから1つ取り出してメインデータに追加
            const nextBar = this.additionalData.shift();
            this.candleSeries.update(nextBar);
            this.chartData.push(nextBar);
            this.fullData.push(nextBar); // 全データにも追加

            // インジケーターも更新
            this.updateIndicators();

            // 現在のステップを新しいデータに進める
            this.currentStep = this.chartData.length - 1;
            return true;
        }
        return false;
    }

    // チャートの更新（空実装）
    updateChart() {
        // 空実装：後でLightweight Chartsを追加予定
    }

    // 個別トグルAPI（main.js から呼ばれる）
    toggleIndicator(key, on) {
        if (!(key in this.indicatorVisible)) return;

        this.indicatorVisible[key] = !!on;

        switch (key) {
            case 'MA5':
                if (this.indicators.ma5) {
                    this.indicators.ma5.applyOptions({ visible: on });
                    if (on) this.updateIndicators();
                }
                break;

            case 'MA25':
                if (this.indicators.ma25) {
                    this.indicators.ma25.applyOptions({ visible: on });
                    if (on) this.updateIndicators();
                }
                break;

            case 'BB':
                if (this.indicators.bbUpper2) {
                    this.indicators.bbUpper2.applyOptions({ visible: on });
                    this.indicators.bbUpper1.applyOptions({ visible: on });
                    this.indicators.bbMiddle.applyOptions({ visible: on });
                    this.indicators.bbLower1.applyOptions({ visible: on });
                    this.indicators.bbLower2.applyOptions({ visible: on });
                    if (on) this.updateIndicators();
                }
                break;

            case 'MACD':
                const macdContainer = document.getElementById('macdContainer');
                if (macdContainer) {
                    if (on) {
                        macdContainer.style.display = 'block';
                        // DOM更新を待ってからチャート初期化
                        setTimeout(() => {
                            // 初回表示時にチャートを初期化
                            if (!this.indicators.macdChart) {
                                this.initializeMACDChart();
                            }
                            // データがあれば更新
                            if (this.chartData.length > 26) {
                                this.updateIndicators();
                            }
                            // 明示的にサイズを設定してリサイズ
                            if (this.indicators.macdChart) {
                                const width = macdContainer.offsetWidth || 800;
                                const height = macdContainer.offsetHeight || 250;
                                this.indicators.macdChart.applyOptions({
                                    width: width,
                                    height: height
                                });
                            }
                        }, 300);
                    } else {
                        macdContainer.style.display = 'none';
                    }
                }
                break;

            case 'RSI':
                const rsiContainer = document.getElementById('rsiContainer');
                if (rsiContainer) {
                    if (on) {
                        rsiContainer.style.display = 'block';
                        // DOM更新を待ってからチャート初期化
                        setTimeout(() => {
                            // 初回表示時にチャートを初期化
                            if (!this.indicators.rsiChart) {
                                this.initializeRSIChart();
                            }
                            // データがあれば更新
                            if (this.chartData.length > 14) {
                                this.updateIndicators();
                            }
                            // 明示的にサイズを設定してリサイズ
                            if (this.indicators.rsiChart) {
                                const width = rsiContainer.offsetWidth || 800;
                                const height = rsiContainer.offsetHeight || 200;
                                this.indicators.rsiChart.applyOptions({
                                    width: width,
                                    height: height
                                });
                            }
                        }, 300);
                    } else {
                        rsiContainer.style.display = 'none';
                    }
                }
                break;

            case 'RCI':
                const rciContainer = document.getElementById('rciContainer');
                if (rciContainer) {
                    if (on) {
                        rciContainer.style.display = 'block';
                        // DOM更新を待ってからチャート初期化
                        setTimeout(() => {
                            // 初回表示時にチャートを初期化
                            if (!this.indicators.rciChart) {
                                this.initializeRCIChart();
                            }
                            // データがあれば更新
                            if (this.chartData.length > 9) {
                                this.updateIndicators();
                            }
                            // 明示的にサイズを設定してリサイズ
                            if (this.indicators.rciChart) {
                                const width = rciContainer.offsetWidth || 800;
                                const height = rciContainer.offsetHeight || 200;
                                this.indicators.rciChart.applyOptions({
                                    width: width,
                                    height: height
                                });
                            }
                        }, 300);
                    } else {
                        rciContainer.style.display = 'none';
                    }
                }
                break;
        }
    }

    // 表示データの更新
    updateDisplayedData() {
        if (this.chartData.length === 0) return { price: 0, time: '' };

        const currentData = this.chartData[this.currentStep];
        const currentPrice = Math.round(currentData.close); // close priceを整数に丸める
        const date = new Date(currentData.time * 1000); // Unixタイムスタンプ（秒）をミリ秒に変換
        const currentTime = date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            price: currentPrice,
            time: currentTime
        };
    }

    // 次のステップに進む
    nextStep() {
        if (this.currentStep < this.chartData.length - 1) {
            this.currentStep++;
            return true;
        }
        return false;
    }

    // ゲーム終了判定
    isGameFinished() {
        return this.additionalData.length === 0 && this.currentStep >= this.chartData.length - 1;
    }

    // リサイズ対応
    resize() {
        if (this.chart) {
            this.chart.resize();
        }

        // 表示されているインジケーターチャートのみリサイズ
        const macdContainer = document.getElementById('macdContainer');
        if (this.indicators.macdChart && macdContainer && macdContainer.style.display !== 'none') {
            this.indicators.macdChart.resize();
        }

        const rsiContainer = document.getElementById('rsiContainer');
        if (this.indicators.rsiChart && rsiContainer && rsiContainer.style.display !== 'none') {
            this.indicators.rsiChart.resize();
        }

        const rciContainer = document.getElementById('rciContainer');
        if (this.indicators.rciChart && rciContainer && rciContainer.style.display !== 'none') {
            this.indicators.rciChart.resize();
        }
    }

    // ===== インジケーター初期化 =====

    initializeIndicators() {
        // 移動平均線
        this.indicators.ma5 = this.chart.addLineSeries({
            color: '#FFD700', // 黄色に変更
            lineWidth: 2,
            visible: this.indicatorVisible.MA5,
            autoscaleInfoProvider: () => null  // 自動スケールに影響しない
        });

        this.indicators.ma25 = this.chart.addLineSeries({
            color: '#4ECDC4',
            lineWidth: 2,
            visible: this.indicatorVisible.MA25,
            autoscaleInfoProvider: () => null  // 自動スケールに影響しない
        });

        // ボリンジャーバンド（5本ライン：σ2上限、σ1上限、中央、σ1下限、σ2下限）
        this.indicators.bbUpper2 = this.chart.addLineSeries({
            color: '#9B59B6',
            lineWidth: 1,
            visible: this.indicatorVisible.BB,
            priceLineVisible: false,  // ラベル数値を非表示
            autoscaleInfoProvider: () => null  // 自動スケールに影響しない
        });

        this.indicators.bbUpper1 = this.chart.addLineSeries({
            color: '#9B59B6',
            lineWidth: 1,
            lineStyle: 1, // 点線
            visible: this.indicatorVisible.BB,
            priceLineVisible: false,  // ラベル数値を非表示
            autoscaleInfoProvider: () => null  // 自動スケールに影響しない
        });

        this.indicators.bbMiddle = this.chart.addLineSeries({
            color: '#9B59B6',
            lineWidth: 2,
            visible: this.indicatorVisible.BB,
            priceLineVisible: false,  // ラベル数値を非表示
            autoscaleInfoProvider: () => null  // 自動スケールに影響しない
        });

        this.indicators.bbLower1 = this.chart.addLineSeries({
            color: '#9B59B6',
            lineWidth: 1,
            lineStyle: 1, // 点線
            visible: this.indicatorVisible.BB,
            priceLineVisible: false,  // ラベル数値を非表示
            autoscaleInfoProvider: () => null  // 自動スケールに影響しない
        });

        this.indicators.bbLower2 = this.chart.addLineSeries({
            color: '#9B59B6',
            lineWidth: 1,
            visible: this.indicatorVisible.BB,
            priceLineVisible: false,  // ラベル数値を非表示
            autoscaleInfoProvider: () => null  // 自動スケールに影響しない
        });

        // MACD、RSI、RCIチャートは表示時に初期化する
    }

    // MACD用チャート初期化
    initializeMACDChart() {
        const container = document.getElementById('macdContainer');
        if (!container) {
            console.error('MACD container not found');
            return;
        }

        console.log('Initializing MACD chart...');

        // コンテナの実際のサイズを取得（20px減算を考慮）
        const containerWidth = (container.offsetWidth || container.clientWidth || 800);
        const containerHeight = container.offsetHeight || container.clientHeight || 250;

        console.log('MACD container actual size:', { width: containerWidth, height: containerHeight });

        this.indicators.macdChart = LightweightCharts.createChart(container, {
            width: containerWidth,
            height: containerHeight,
            layout: {
                background: { color: '#000000' },
                textColor: '#D1D4DC',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            timeScale: {
                borderColor: '#485c7b',
                timeVisible: false,
                secondsVisible: false,
                rightOffset: 50, // メインチャートと同じ右側余白
                barSpacing: 8,   // メインチャートと同じ間隔
            },
            rightPriceScale: {
                scaleMargins: { top: 0.1, bottom: 0.1 },
            }
        });

        this.indicators.macdHistogram = this.indicators.macdChart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
        });

        this.indicators.macdLine = this.indicators.macdChart.addLineSeries({
            color: '#FF6B6B',
            lineWidth: 2,
        });

        this.indicators.macdSignal = this.indicators.macdChart.addLineSeries({
            color: '#4ECDC4',
            lineWidth: 2,
        });

        console.log('MACD chart initialized successfully');
    }

    // RSI用チャート初期化
    initializeRSIChart() {
        const container = document.getElementById('rsiContainer');
        if (!container) return;

        // コンテナの実際のサイズを取得
        const containerWidth = container.offsetWidth || container.clientWidth || 800;
        const containerHeight = container.offsetHeight || container.clientHeight || 200;

        console.log('RSI container actual size:', { width: containerWidth, height: containerHeight });

        this.indicators.rsiChart = LightweightCharts.createChart(container, {
            width: containerWidth,
            height: containerHeight,
            layout: {
                background: { color: '#000000' },
                textColor: '#D1D4DC',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            timeScale: {
                borderColor: '#485c7b',
                timeVisible: false,
                secondsVisible: false,
                rightOffset: 50, // メインチャートと同じ右側余白
                barSpacing: 8,   // メインチャートと同じ間隔
            },
            rightPriceScale: {
                scaleMargins: { top: 0.1, bottom: 0.1 },
                entireTextOnly: true,
            }
        });

        this.indicators.rsiLine = this.indicators.rsiChart.addLineSeries({
            color: '#E74C3C',
            lineWidth: 2,
        });
    }

    // RCI用チャート初期化
    initializeRCIChart() {
        const container = document.getElementById('rciContainer');
        if (!container) return;

        // コンテナの実際のサイズを取得
        const containerWidth = container.offsetWidth || container.clientWidth || 800;
        const containerHeight = container.offsetHeight || container.clientHeight || 200;

        console.log('RCI container actual size:', { width: containerWidth, height: containerHeight });

        this.indicators.rciChart = LightweightCharts.createChart(container, {
            width: containerWidth,
            height: containerHeight,
            layout: {
                background: { color: '#000000' },
                textColor: '#D1D4DC',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            timeScale: {
                borderColor: '#485c7b',
                timeVisible: false,
                secondsVisible: false,
                rightOffset: 50, // メインチャートと同じ右側余白
                barSpacing: 8,   // メインチャートと同じ間隔
            },
            rightPriceScale: {
                scaleMargins: { top: 0.1, bottom: 0.1 },
                entireTextOnly: true,
            }
        });

        // RCI 9期間（短期）- 赤色
        this.indicators.rci9Line = this.indicators.rciChart.addLineSeries({
            color: '#FF6B6B',
            lineWidth: 2,
        });

        // RCI 26期間（中期）- 青緑色
        this.indicators.rci26Line = this.indicators.rciChart.addLineSeries({
            color: '#4ECDC4',
            lineWidth: 2,
        });

        // RCI基準線（-80, 0, +80）
        this.indicators.rciChart.addLineSeries({
            color: '#666666',
            lineWidth: 1,
            lineStyle: 2, // 破線
        }).setData([
            { time: 0, value: 80 },
            { time: 9999999999, value: 80 }
        ]);

        this.indicators.rciChart.addLineSeries({
            color: '#666666',
            lineWidth: 1,
            lineStyle: 2, // 破線
        }).setData([
            { time: 0, value: 0 },
            { time: 9999999999, value: 0 }
        ]);

        this.indicators.rciChart.addLineSeries({
            color: '#666666',
            lineWidth: 1,
            lineStyle: 2, // 破線
        }).setData([
            { time: 0, value: -80 },
            { time: 9999999999, value: -80 }
        ]);
    }

    // インジケーター更新
    updateIndicators() {
        if (this.fullData.length < 5) return; // 最低限のデータが必要（MA5用）

        // 移動平均線
        if (this.indicatorVisible.MA5 && this.indicators.ma5 && this.fullData.length >= 5) {
            const ma5Data = this.calculateMA(5);
            this.indicators.ma5.setData(ma5Data);
            console.log('MA5 updated:', ma5Data.length, 'points');
        }

        if (this.indicatorVisible.MA25 && this.indicators.ma25 && this.fullData.length >= 25) {
            const ma25Data = this.calculateMA(25);
            this.indicators.ma25.setData(ma25Data);
            console.log('MA25 updated:', ma25Data.length, 'points');
        }

        // ボリンジャーバンド（σ1とσ2の5本ライン）
        if (this.indicatorVisible.BB && this.indicators.bbUpper2 && this.fullData.length >= 20) {
            const bbData = this.calculateBB(20);
            this.indicators.bbUpper2.setData(bbData.upper2);
            this.indicators.bbUpper1.setData(bbData.upper1);
            this.indicators.bbMiddle.setData(bbData.middle);
            this.indicators.bbLower1.setData(bbData.lower1);
            this.indicators.bbLower2.setData(bbData.lower2);
            console.log('BB updated:', bbData.middle.length, 'points');
        }

        // MACD
        if (this.indicatorVisible.MACD && this.indicators.macdHistogram && this.fullData.length > 26) {
            try {
                const macdData = this.calculateMACD(12, 26, 9);
                this.indicators.macdHistogram.setData(macdData.histogram);
                this.indicators.macdLine.setData(macdData.macd);
                this.indicators.macdSignal.setData(macdData.signal);
            } catch (error) {
                console.error('MACD update error:', error);
            }
        }

        // RSI
        if (this.indicatorVisible.RSI && this.indicators.rsiLine && this.fullData.length > 14) {
            try {
                const rsiData = this.calculateRSI(14);
                this.indicators.rsiLine.setData(rsiData);
            } catch (error) {
                console.error('RSI update error:', error);
            }
        }

        // RCI
        if (this.indicatorVisible.RCI && this.indicators.rci9Line && this.fullData.length > 9) {
            try {
                // RCI 9期間（短期）
                const rci9Data = this.calculateRCI(9);
                this.indicators.rci9Line.setData(rci9Data);
                console.log('RCI9 updated:', rci9Data.length, 'points');

                // RCI 26期間（中期）
                if (this.fullData.length > 26) {
                    const rci26Data = this.calculateRCI(26);
                    this.indicators.rci26Line.setData(rci26Data);
                    console.log('RCI26 updated:', rci26Data.length, 'points');
                }
            } catch (error) {
                console.error('RCI update error:', error);
            }
        }
    }

    // ===== インジケーター計算関数 =====

    // 移動平均線計算
    calculateMA(period) {
        const closes = this.fullData.map(item => item.close);
        const result = [];

        // MA計算開始

        for (let i = 0; i < closes.length; i++) {
            if (i < period - 1) {
                continue;
            }

            const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            const avg = sum / period;

            // 表示範囲のデータのみ結果に含める
            const dataIndex = this.historicalData.length > 0 ? i - this.historicalData.length : i;
            if (dataIndex >= 0 && dataIndex < this.chartData.length) {
                result.push({ time: this.chartData[dataIndex].time, value: avg });
            }
        }

        // MA計算完了
        return result.filter(item => item.value !== null);
    }

    // ボリンジャーバンド計算（σ1とσ2の5本ライン）
    calculateBB(period = 20) {
        const closes = this.fullData.map(item => item.close);
        const upper2 = [], upper1 = [], middle = [], lower1 = [], lower2 = [];

        for (let i = 0; i < closes.length; i++) {
            if (i < period - 1) {
                continue;
            }

            const slice = closes.slice(i - period + 1, i + 1);
            const avg = slice.reduce((a, b) => a + b, 0) / period;
            const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
            const stdDev = Math.sqrt(variance);

            // 表示範囲のデータのみ結果に含める
            const dataIndex = this.historicalData.length > 0 ? i - this.historicalData.length : i;
            if (dataIndex >= 0 && dataIndex < this.chartData.length) {
                const time = this.chartData[dataIndex].time;
                middle.push({ time, value: avg });

                // σ1ライン
                upper1.push({ time, value: avg + stdDev });
                lower1.push({ time, value: avg - stdDev });

                // σ2ライン
                upper2.push({ time, value: avg + (stdDev * 2) });
                lower2.push({ time, value: avg - (stdDev * 2) });
            }
        }

        return { upper2, upper1, middle, lower1, lower2 };
    }

    // MACD計算
    calculateMACD(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const closes = this.fullData.map(item => item.close);
        const emaFast = this.calculateEMA(closes, fastPeriod);
        const emaSlow = this.calculateEMA(closes, slowPeriod);

        const macdLine = [];
        for (let i = 0; i < Math.min(emaFast.length, emaSlow.length); i++) {
            macdLine.push(emaFast[i] - emaSlow[i]);
        }

        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        const histogram = [];

        for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
            histogram.push(macdLine[i] - signalLine[i]);
        }

        const startIndex = slowPeriod - 1;
        const result = {
            macd: [],
            signal: [],
            histogram: []
        };

        for (let i = 0; i < macdLine.length; i++) {
            const fullDataIndex = startIndex + i;
            const displayDataIndex = this.historicalData.length > 0 ? fullDataIndex - this.historicalData.length : fullDataIndex;
            if (displayDataIndex >= 0 && displayDataIndex < this.chartData.length) {
                const time = this.chartData[displayDataIndex].time;
                result.macd.push({ time, value: macdLine[i] });
                if (i < signalLine.length) {
                    result.signal.push({ time, value: signalLine[i] });
                    result.histogram.push({ time, value: histogram[i] });
                }
            }
        }

        return result;
    }

    // EMA計算ヘルパー
    calculateEMA(data, period) {
        const multiplier = 2 / (period + 1);
        const result = [];

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                result.push(data[i]);
            } else {
                result.push((data[i] * multiplier) + (result[i - 1] * (1 - multiplier)));
            }
        }

        return result;
    }

    // RSI計算
    calculateRSI(period = 14) {
        const closes = this.fullData.map(item => item.close);
        const result = [];

        for (let i = period; i < closes.length; i++) {
            let gains = 0, losses = 0;

            for (let j = i - period + 1; j <= i; j++) {
                const change = closes[j] - closes[j - 1];
                if (change > 0) gains += change;
                else losses -= change;
            }

            const avgGain = gains / period;
            const avgLoss = losses / period;
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));

            // 表示範囲のデータのみ結果に含める
            const displayDataIndex = this.historicalData.length > 0 ? i - this.historicalData.length : i;
            if (displayDataIndex >= 0 && displayDataIndex < this.chartData.length) {
                result.push({ time: this.chartData[displayDataIndex].time, value: rsi });
            }
        }

        return result;
    }

    // RCI計算
    calculateRCI(period = 9) {
        const closes = this.fullData.map(item => item.close);
        const result = [];

        for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            const priceRanks = this.getRanks(slice);
            const timeRanks = Array.from({ length: period }, (_, idx) => idx + 1);

            let sumD2 = 0;
            for (let j = 0; j < period; j++) {
                const d = priceRanks[j] - timeRanks[j];
                sumD2 += d * d;
            }

            const rci = (1 - (6 * sumD2) / (period * (period * period - 1))) * 100;

            // 表示範囲のデータのみ結果に含める
            const displayDataIndex = this.historicalData.length > 0 ? i - this.historicalData.length : i;
            if (displayDataIndex >= 0 && displayDataIndex < this.chartData.length) {
                result.push({ time: this.chartData[displayDataIndex].time, value: rci });
            }
        }

        return result;
    }

    // ランク計算ヘルパー
    getRanks(array) {
        const sorted = array.map((value, index) => ({ value, index }))
                           .sort((a, b) => b.value - a.value);
        const ranks = new Array(array.length);

        for (let i = 0; i < sorted.length; i++) {
            ranks[sorted[i].index] = i + 1;
        }

        return ranks;
    }
}

// グローバルチャートマネージャーインスタンス
let chartManager = null;

// チャート初期化関数
function initChart() {
    console.log('Initializing chart manager...');
    chartManager = new ChartManager('chartContainer');

    // ウィンドウリサイズイベントリスナーを追加
    window.addEventListener('resize', () => {
        if (chartManager) {
            chartManager.resize();
        }
    });

    return chartManager;
}
