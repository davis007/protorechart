// チャート描画制御クラス
class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.chartData = { times: [], prices: [], volumes: [] };
        this.additionalData = { times: [], prices: [], volumes: [] };
        this.currentStep = 0;

        // 追加: 終値配列のキャッシュ
        this.closes = [];

        // 追加: インジケーター表示状態
        this.indicatorVisible = {
            MA5: true,
            MA25: true,
            BB: false,
            MACD: false,
            RSI: false,
            RCI: false
        };

        this.initChart();
    }

    // チャートの初期化
    initChart() {
        this.chart = echarts.init(document.getElementById(this.containerId));

        const option = {
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                borderWidth: 1,
                borderColor: '#ccc',
                padding: 10,
                textStyle: { color: '#333' }
            },
            legend: {
                data: ['K線', 'MA5', 'MA25', 'UpperBB', 'MiddleBB', 'LowerBB', 'Volume', 'MACD', 'Signal', 'Hist', 'RSI', 'RCI'],
                top: 6
            },
            grid: [
                { left: '8%', right: '6%', height: '42%' },   // 0: 価格＋MA/BB
                { left: '8%', right: '6%', top: '48%', height: '14%' }, // 1: 出来高
                { left: '8%', right: '6%', top: '65%', height: '14%' }, // 2: MACD
                { left: '8%', right: '6%', top: '82%', height: '14%' }  // 3: RSI/RCI
            ],
            xAxis: [
                { type: 'category', data: [], scale: true, boundaryGap: false, axisLine: { onZero: false }, splitLine: { show: false }, splitNumber: 20, min: 'dataMin', max: 'dataMax' }, // 0
                { type: 'category', gridIndex: 1, data: [], boundaryGap: false, axisLabel: { show: false }, axisTick:{show:false}, splitLine:{show:false}}, // 1 volume
                { type: 'category', gridIndex: 2, data: [], boundaryGap: false, axisLabel: { show: false }, axisTick:{show:false}, splitLine:{show:false}}, // 2 macd
                { type: 'category', gridIndex: 3, data: [], boundaryGap: false, axisLabel: { show: false }, axisTick:{show:false}, splitLine:{show:false}}  // 3 rsi/rci
            ],
            yAxis: [
                { scale: true, splitArea: { show: true } }, // 0 price
                { scale: true, gridIndex: 1, splitNumber: 2, axisLabel:{show:false}, axisLine:{show:false}, axisTick:{show:false}, splitLine:{show:false} }, // 1 volume
                { scale: true, gridIndex: 2, splitNumber: 3 }, // 2 macd
                { scale: true, gridIndex: 3, splitNumber: 3, min: 0, max: 100 } // 3 rsi/rci (RSIは0-100)
            ],
            dataZoom: [
                { type: 'inside', xAxisIndex: [0,1,2,3], start: 0, end: 100 }
            ],
            series: [
                // 価格
                { name: 'K線', type: 'candlestick', data: [], itemStyle: { color: '#ef232a', color0: '#14b143', borderColor: '#ef232a', borderColor0: '#14b143' } },
                { name: 'MA5', type: 'line', data: [], smooth: true, lineStyle: { opacity: 0.8 }, showSymbol:false },
                { name: 'MA25', type: 'line', data: [], smooth: true, lineStyle: { opacity: 0.8 }, showSymbol:false },

                // BB（価格グリッド）
                { name: 'UpperBB', type: 'line', data: [], smooth: true, lineStyle: { type:'dashed', opacity: 0.7 }, showSymbol:false },
                { name: 'MiddleBB', type: 'line', data: [], smooth: true, lineStyle: { opacity: 0.5 }, showSymbol:false },
                { name: 'LowerBB', type: 'line', data: [], smooth: true, lineStyle: { type:'dashed', opacity: 0.7 }, showSymbol:false },

                // 出来高
                { name: 'Volume', type: 'bar', xAxisIndex:1, yAxisIndex:1, data: [] },

                // MACD（棒＝ヒストグラム／線＝MACD・シグナル）
                { name: 'Hist',   type: 'bar',  xAxisIndex:2, yAxisIndex:2, data: [], large:true, itemStyle:{opacity:0.7} },
                { name: 'MACD',   type: 'line', xAxisIndex:2, yAxisIndex:2, data: [], showSymbol:false },
                { name: 'Signal', type: 'line', xAxisIndex:2, yAxisIndex:2, data: [], showSymbol:false },

                // RSI/RCI（同一グリッドに重ねる）
                { name: 'RSI', type: 'line', xAxisIndex:3, yAxisIndex:3, data: [], showSymbol:false },
                { name: 'RCI', type: 'line', xAxisIndex:3, yAxisIndex:3, data: [], showSymbol:false }
            ]
        };

        this.chart.setOption(option);
    }

    // 単純移動平均
    sma(values, period) {
        const out = [];
        for (let i = 0; i < values.length; i++) {
            if (i < period - 1) { out.push('-'); continue; }
            const slice = values.slice(i - period + 1, i + 1);
            const avg = slice.reduce((a,b)=>a+b,0) / period;
            out.push(+avg.toFixed(3));
        }
        return out;
    }

    // EMA（MACDで使用）
    ema(values, period) {
        const k = 2 / (period + 1);
        const out = [];
        let prev;
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            if (i === 0) {
                prev = v; out.push(v);
            } else {
                prev = v * k + prev * (1 - k);
                out.push(+prev.toFixed(6));
            }
        }
        return out;
    }

    // 移動平均の計算
    calculateMA(period) {
        return this.sma(this.closes, period);
    }

    // ボリンジャーバンド
    calculateBB(period = 20, stdDev = 2) {
        const upper = [], middle = [], lower = [];
        for (let i = 0; i < this.closes.length; i++) {
            if (i < period - 1) { upper.push('-'); middle.push('-'); lower.push('-'); continue; }
            const slice = this.closes.slice(i - period + 1, i + 1);
            const avg = slice.reduce((a,b)=>a+b,0) / period;
            const variance = slice.reduce((a,b)=> a + Math.pow(b - avg, 2), 0) / period;
            const std = Math.sqrt(variance);
            middle.push(+avg.toFixed(3));
            upper.push(+(avg + stdDev*std).toFixed(3));
            lower.push(+(avg - stdDev*std).toFixed(3));
        }
        return { upper, middle, lower };
    }

    // MACD（12,26,9 デフォルト）
    calculateMACD(shortP = 12, longP = 26, sigP = 9) {
        const emaShort = this.ema(this.closes, shortP);
        const emaLong  = this.ema(this.closes, longP);
        const macd = emaShort.map((v, i) => +(v - emaLong[i]).toFixed(6));
        const signal = this.ema(macd, sigP);
        const hist = macd.map((v, i) => +(v - signal[i]).toFixed(6));
        return { macd, signal, hist };
    }

    // RSI（14）
    calculateRSI(period = 14) {
        const out = [];
        let gains = 0, losses = 0;

        out.push('-'); // 最初は比較不可
        for (let i = 1; i < this.closes.length; i++) {
            const diff = this.closes[i] - this.closes[i - 1];
            if (i <= period) {
                if (diff > 0) gains += diff; else losses -= diff;
                out.push('-');
                continue;
            }
            // 直近期の更新（Wilder法のEMA的平滑を使わず、単純移動のスライド版）
            const prevDiff = this.closes[i - period + 1] - this.closes[i - period];
            if (prevDiff > 0) gains -= prevDiff; else losses += prevDiff;
            if (diff > 0) gains += diff; else losses -= diff;

            const avgGain = gains / period;
            const avgLoss = losses / period;
            const rs = avgLoss === 0 ? 0 : (avgGain / avgLoss);
            const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
            out.push(+rsi.toFixed(2));
        }
        return out;
    }

    // RCI（Rank Correlation Index, 9 推奨）
    calculateRCI(period = 9) {
        const n = this.closes.length;
        const out = [];
        for (let i = 0; i < n; i++) {
            if (i < period - 1) { out.push('-'); continue; }
            const slice = this.closes.slice(i - period + 1, i + 1);

            // 時間順位（固定）: 1..period
            const timeRank = Array.from({length: period}, (_, k) => k + 1);

            // 終値順位（小さい順に1）
            const idx = slice.map((v, k) => ({ v, k })).sort((a,b)=>a.v-b.v);
            const priceRank = Array(period).fill(0);
            idx.forEach((obj, rank) => { priceRank[obj.k] = rank + 1; });

            // d_i = timeRank_i - priceRank_i
            let sumD2 = 0;
            for (let k = 0; k < period; k++) {
                const d = timeRank[k] - priceRank[k];
                sumD2 += d*d;
            }
            const r = 1 - (6 * sumD2) / (period * (period*period - 1)); // スピアマン相関
            const rci = +(r * 100).toFixed(2);
            out.push(rci);
        }
        return out;
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

        // 終値配列キャッシュ
        this.closes = this.chartData.prices.map(p => p[1]);

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
        const opt = this.chart.getOption();

        // x軸の同期
        opt.xAxis[0].data = this.chartData.times;
        opt.xAxis[1].data = this.chartData.times;
        opt.xAxis[2].data = this.chartData.times;
        opt.xAxis[3].data = this.chartData.times;

        // 価格・出来高
        opt.series[0].data = this.chartData.prices;   // K線
        opt.series[6].data = this.chartData.volumes;  // Volume

        // 終値更新（追加済みなら再生成）
        this.closes = this.chartData.prices.map(p => p[1]);

        // --- MA ---
        const ma5  = this.calculateMA(5);
        const ma25 = this.calculateMA(25);
        opt.series[1].data = ma5;
        opt.series[2].data = ma25;

        // --- BB ---
        const bb = this.calculateBB(20, 2);
        opt.series[3].data = bb.upper;   // UpperBB
        opt.series[4].data = bb.middle;  // MiddleBB
        opt.series[5].data = bb.lower;   // LowerBB

        // --- MACD ---
        const macd = this.calculateMACD(12, 26, 9);
        opt.series[7].data = macd.hist;    // Hist (bar)
        opt.series[8].data = macd.macd;    // MACD (line)
        opt.series[9].data = macd.signal;  // Signal (line)

        // --- RSI / RCI ---
        opt.series[10].data = this.calculateRSI(14);
        opt.series[11].data = this.calculateRCI(9);

        // 表示状態（opacity or show）切替
        this.applyVisibility(opt);

        this.chart.setOption(opt, false, true);
    }

    // 表示/非表示を適用する関数
    applyVisibility(opt) {
        // 価格グリッド: MA/BB
        opt.series[1].lineStyle.opacity = this.indicatorVisible.MA5  ? 0.85 : 0;
        opt.series[2].lineStyle.opacity = this.indicatorVisible.MA25 ? 0.85 : 0;

        const bbOn = this.indicatorVisible.BB;
        ['3','4','5'].forEach(i => {        // Upper/Middle/Lower
            if (!opt.series[i].lineStyle) opt.series[i].lineStyle = {};
            opt.series[i].lineStyle.opacity = bbOn ? 0.8 : 0;
        });

        // MACDグリッド
        const macdOn = this.indicatorVisible.MACD;
        opt.series[7].itemStyle = opt.series[7].itemStyle || {};
        opt.series[7].itemStyle.opacity = macdOn ? 0.8 : 0;
        opt.series[8].lineStyle = opt.series[8].lineStyle || {};
        opt.series[9].lineStyle = opt.series[9].lineStyle || {};
        opt.series[8].lineStyle.opacity = macdOn ? 0.9 : 0;
        opt.series[9].lineStyle.opacity = macdOn ? 0.9 : 0;

        // RSI/RCIグリッド
        const rsiOn = this.indicatorVisible.RSI;
        const rciOn = this.indicatorVisible.RCI;
        opt.series[10].lineStyle = opt.series[10].lineStyle || {};
        opt.series[11].lineStyle = opt.series[11].lineStyle || {};
        opt.series[10].lineStyle.opacity = rsiOn ? 0.9 : 0;
        opt.series[11].lineStyle.opacity = rciOn ? 0.9 : 0;

        // 凡例の選択状態も合わせる（視覚的に分かりやすく）
        opt.legend.selected = {
            'K線': true,
            'MA5':  this.indicatorVisible.MA5,
            'MA25': this.indicatorVisible.MA25,
            'UpperBB': bbOn, 'MiddleBB': bbOn, 'LowerBB': bbOn,
            'Volume': true,
            'Hist': macdOn, 'MACD': macdOn, 'Signal': macdOn,
            'RSI': rsiOn, 'RCI': rciOn
        };
    }

    // 個別トグルAPI（main.js から呼ばれる）
    toggleIndicator(key, on) {
        if (!(key in this.indicatorVisible)) return;
        this.indicatorVisible[key] = !!on;

        const opt = this.chart.getOption();
        this.applyVisibility(opt);
        this.chart.setOption(opt, false, true);
    }

    // 表示データの更新
    updateDisplayedData() {
        if (this.chartData.prices.length === 0) return { price: 0, time: '' };

        const currentPrice = Math.round(this.chartData.prices[this.currentStep][1]); // close priceを整数に丸める
        const currentTime = this.chartData.times[this.currentStep];

        return {
            price: currentPrice,
            time: currentTime
        };
    }

    // 次のステップに進む
    nextStep() {
        if (this.currentStep < this.chartData.times.length - 1) {
            this.currentStep++;
            return true;
        }
        return false;
    }

    // ゲーム終了判定
    isGameFinished() {
        return this.additionalData.times.length === 0 && this.currentStep >= this.chartData.times.length - 1;
    }
}

// グローバルチャートマネージャーインスタンス
let chartManager = null;

// チャート初期化関数
function initChart() {
    chartManager = new ChartManager('chartContainer');
    return chartManager;
}
