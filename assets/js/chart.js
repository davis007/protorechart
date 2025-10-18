// チャート描画制御クラス
class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chartData = [];
        this.additionalData = [];
        this.currentStep = 0;
        this.chart = null;
        this.candleSeries = null;
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

            console.log('Chart initialized successfully');
        } catch (error) {
            console.error('Error initializing chart:', error);
        }
    }



    // データの読み込み（Lightweight Charts形式に変換）
    loadData(chartData) {
        // 初期データの変換
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

        // 初期データをチャートに設定
        if (this.candleSeries && this.chartData.length > 0) {
            this.candleSeries.setData(this.chartData);
        }
    }

    // 次の5分足を追加（リアルタイム更新）
    addNextCandle() {
        if (this.additionalData.length > 0) {
            // 追加データから1つ取り出してメインデータに追加
            const nextBar = this.additionalData.shift();
            this.candleSeries.update(nextBar);
            this.chartData.push(nextBar);

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
        // 空実装：後でLightweight Chartsを追加予定
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
    }
}

// グローバルチャートマネージャーインスタンス
let chartManager = null;

// チャート初期化関数
function initChart() {
    console.log('Initializing chart manager...');
    chartManager = new ChartManager('chartContainer');
    return chartManager;
}
