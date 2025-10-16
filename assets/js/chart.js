// チャート描画制御クラス
class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.chartData = {
            times: [],
            prices: [],
            volumes: []
        };
        this.additionalData = {
            times: [],
            prices: [],
            volumes: []
        };
        this.currentStep = 0;
        this.initChart();
    }

    // チャートの初期化
    initChart() {
        this.chart = echarts.init(document.getElementById(this.containerId));

        const option = {
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                borderWidth: 1,
                borderColor: '#ccc',
                padding: 10,
                textStyle: {
                    color: '#333'
                }
            },
            legend: {
                data: ['K線', 'MA5', 'MA25', 'Volume'],
                top: 10
            },
            grid: [
                {
                    left: '10%',
                    right: '20%', // 右側に20%の余白を追加
                    height: '50%'
                },
                {
                    left: '10%',
                    right: '20%', // 右側に20%の余白を追加
                    top: '63%',
                    height: '16%'
                }
            ],
            xAxis: [
                {
                    type: 'category',
                    data: this.chartData.times,
                    scale: true,
                    boundaryGap: false,
                    axisLine: { onZero: false },
                    splitLine: { show: false },
                    splitNumber: 20,
                    min: 'dataMin',
                    max: 'dataMax'
                },
                {
                    type: 'category',
                    gridIndex: 1,
                    data: this.chartData.times,
                    scale: true,
                    boundaryGap: false,
                    axisLine: { onZero: false },
                    axisTick: { show: false },
                    splitLine: { show: false },
                    axisLabel: { show: false },
                    splitNumber: 20,
                    min: 'dataMin',
                    max: 'dataMax'
                }
            ],
            yAxis: [
                {
                    scale: true,
                    splitArea: { show: true }
                },
                {
                    scale: true,
                    gridIndex: 1,
                    splitNumber: 2,
                    axisLabel: { show: false },
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { show: false }
                }
            ],
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1],
                    start: 0,
                    end: 100
                }
            ],
            series: [
                {
                    name: 'K線',
                    type: 'candlestick',
                    data: this.chartData.prices,
                    itemStyle: {
                        color: '#ef232a',
                        color0: '#14b143',
                        borderColor: '#ef232a',
                        borderColor0: '#14b143'
                    }
                },
                {
                    name: 'MA5',
                    type: 'line',
                    data: this.calculateMA(5),
                    smooth: true,
                    lineStyle: {
                        opacity: 0.5
                    }
                },
                {
                    name: 'MA25',
                    type: 'line',
                    data: this.calculateMA(25),
                    smooth: true,
                    lineStyle: {
                        opacity: 0.5
                    }
                },
                {
                    name: 'Volume',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: this.chartData.volumes
                }
            ]
        };

        this.chart.setOption(option);
    }

    // 移動平均の計算
    calculateMA(dayCount) {
        const result = [];
        for (let i = 0; i < this.chartData.prices.length; i++) {
            if (i < dayCount) {
                result.push('-');
                continue;
            }
            let sum = 0;
            for (let j = 0; j < dayCount; j++) {
                sum += this.chartData.prices[i - j][1]; // close price
            }
            result.push(+(sum / dayCount).toFixed(3));
        }
        return result;
    }

    // データの読み込み
    loadData(chartData) {
        // 初期データの読み込み
        this.chartData.times = chartData.prices.map(item => {
            const date = new Date(item.time);
            return date.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });
        });

        this.chartData.prices = chartData.prices.map(item => [
            item.open,
            item.close,
            item.low,
            item.high
        ]);

        this.chartData.volumes = chartData.prices.map(item => item.volume);

        // 追加データの読み込み
        if (chartData.additional_prices) {
            this.additionalData.times = chartData.additional_prices.map(item => {
                const date = new Date(item.time);
                return date.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            });

            this.additionalData.prices = chartData.additional_prices.map(item => [
                item.open,
                item.close,
                item.low,
                item.high
            ]);

            this.additionalData.volumes = chartData.additional_prices.map(item => item.volume);
        }

        this.updateChart();
    }

    // 次の5分足を追加
    addNextCandle() {
        if (this.additionalData.times.length > 0) {
            // 追加データから1つ取り出してメインデータに追加
            const nextTime = this.additionalData.times.shift();
            const nextPrice = this.additionalData.prices.shift();
            const nextVolume = this.additionalData.volumes.shift();

            this.chartData.times.push(nextTime);
            this.chartData.prices.push(nextPrice);
            this.chartData.volumes.push(nextVolume);

            // 現在のステップを新しいデータに進める
            this.currentStep = this.chartData.times.length - 1;
            this.updateChart();
            return true;
        }
        return false;
    }

    // チャートの更新
    updateChart() {
        const option = this.chart.getOption();

        option.xAxis[0].data = this.chartData.times;
        option.xAxis[1].data = this.chartData.times;
        option.series[0].data = this.chartData.prices;
        option.series[1].data = this.calculateMA(5);
        option.series[2].data = this.calculateMA(25);
        option.series[3].data = this.chartData.volumes;

        this.chart.setOption(option);
    }

    // 次のステップに進む
    nextStep() {
        if (this.currentStep < this.chartData.times.length - 1) {
            this.currentStep++;
            this.updateChart(); // チャートを更新
            this.updateDisplayedData();
            return true;
        }
        return false;
    }

    // 表示データの更新
    updateDisplayedData() {
        const currentPriceData = this.chartData.prices[this.currentStep];
        const currentTime = this.chartData.times[this.currentStep];

        // 現在価格を更新
        const currentPrice = currentPriceData[1]; // close price
        $('#currentPrice').text(currentPrice.toLocaleString() + '円');

        // 時間表示を更新
        $('#timeInfo').text(`時間: ${currentTime}`);

        return {
            price: currentPrice,
            time: currentTime
        };
    }

    // 現在の価格を取得
    getCurrentPrice() {
        if (this.currentStep < this.chartData.prices.length) {
            return this.chartData.prices[this.currentStep][1]; // close price
        }
        return 0;
    }

    // ゲームが終了したかチェック
    isGameFinished() {
        // 追加データがなく、かつ現在のステップが最後のデータに達したらゲーム終了
        return this.additionalData.times.length === 0 && this.currentStep >= this.chartData.times.length - 1;
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

// チャートの初期化関数
function initChart() {
    chartManager = new ChartManager('chartContainer');

    // ウィンドウリサイズ時の対応
    $(window).resize(function() {
        if (chartManager) {
            chartManager.resize();
        }
    });

    return chartManager;
}
