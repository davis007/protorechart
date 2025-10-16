// ゲーム管理クラス
class GameManager {
    constructor(gameData) {
        this.gameData = gameData;
        this.currentPrice = 0;
        this.isPositionOpen = false;
        this.positionType = null; // 'buy' or 'sell'
        this.entryPrice = 0;
        this.positionQuantity = 0;
        this.initGame();
    }

    // ゲームの初期化
    initGame() {
        this.loadChartData();
        this.setupEventListeners();
        this.updateUI();
    }

    // チャートデータの読み込み
    loadChartData() {
        $.ajax({
            url: 'api/get_chart.php',
            type: 'GET',
            dataType: 'json',
            success: (response) => {
                if (response.success) {
                    this.setupGame(response);
                } else {
                    alert('チャートデータの読み込みに失敗しました: ' + response.error);
                }
            },
            error: () => {
                alert('チャートデータの読み込みに失敗しました');
            }
        });
    }

    // ゲームのセットアップ
    setupGame(chartData) {
        // 銘柄情報の表示
        $('#companyInfo').html(`
            ${chartData.company.name} (${chartData.company.code})<br>
            <small class="text-muted">${chartData.company.date}</small>
        `);

        // チャートの初期化とデータ読み込み
        chartManager = initChart();
        chartManager.loadData(chartData);

        // 最初の価格を表示
        const currentData = chartManager.updateDisplayedData();
        this.currentPrice = currentData.price;

        // 次のステップボタンを有効化
        $('#nextStepBtn').prop('disabled', false);
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // 取引ボタン
        $('#buyBtn').click(() => this.executeTrade('buy'));
        $('#sellBtn').click(() => this.executeTrade('sell'));
        $('#closePositionBtn').click(() => this.closePosition());

        // 次のステップボタン
        $('#nextStepBtn').click(() => this.nextStep());

        // ゲーム終了ボタン
        $('#finishGameBtn').click(() => this.finishGame());

        // インジケーター表示切り替え
        $('#toggleIndicators').click(() => this.toggleIndicators());
    }

    // 取引の実行
    executeTrade(type) {
        if (this.isPositionOpen) {
            alert('既にポジションを持っています。利確してから新しい取引を行ってください。');
            return;
        }

        const quantity = parseInt($('#stockQuantity').val());
        const totalCost = this.currentPrice * quantity;

        // 信用取引の証拠金計算（30%）
        const marginRequired = totalCost * 0.3;

        // 証拠金チェック
        if (marginRequired > this.gameData.current_cash) {
            alert('証拠金が不足しています');
            return;
        }

        // 取引の実行
        this.openPosition(type, quantity, this.currentPrice);
        this.updateUI();

        alert(`${type === 'buy' ? '買い' : '売り'}注文を実行しました\n数量: ${quantity}株\n価格: ${this.currentPrice.toLocaleString()}円\n必要証拠金: ${marginRequired.toLocaleString()}円`);
    }

    // ポジションのオープン
    openPosition(type, quantity, price) {
        this.isPositionOpen = true;
        this.positionType = type;
        this.positionQuantity = quantity;
        this.entryPrice = price;

        // 信用取引：買い・売りともに証拠金（30%）のみを資金から減算
        const marginRequired = price * quantity * 0.3;
        this.gameData.current_cash -= marginRequired;
    }

    // ポジションのクローズ
    closePosition() {
        if (!this.isPositionOpen) return;

        const currentValue = this.currentPrice * this.positionQuantity;
        const entryValue = this.entryPrice * this.positionQuantity;

        let profitLoss = 0;

        // 証拠金の返却（建玉時に減算した30%を戻す）
        const marginReturn = this.entryPrice * this.positionQuantity * 0.3;

        if (this.positionType === 'buy') {
            // 買い建て（ロング）ポジションの利確
            profitLoss = currentValue - entryValue;
            // 証拠金返却 + 損益を加算
            this.gameData.current_cash += marginReturn + profitLoss;
        } else {
            // 売り建て（ショート）ポジションの利確
            profitLoss = entryValue - currentValue;
            // 証拠金返却 + 損益を加算
            this.gameData.current_cash += marginReturn + profitLoss;
        }

        this.gameData.profit_loss += profitLoss;

        alert(`利確しました\n損益: ${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString()}円`);

        // ポジションのリセット
        this.isPositionOpen = false;
        this.positionType = null;
        this.positionQuantity = 0;
        this.entryPrice = 0;

        this.updateUI();
    }


    // 評価損益の計算
    calculateUnrealizedProfitLoss() {
        if (!this.isPositionOpen) return 0;

        const currentValue = this.currentPrice * this.positionQuantity;
        const entryValue = this.entryPrice * this.positionQuantity;

        if (this.positionType === 'buy') {
            return currentValue - entryValue;
        } else {
            return entryValue - currentValue;
        }
    }

    // 次のステップに進む
    nextStep() {
        if (!chartManager) return;

        // まず次の5分足を追加
        const added = chartManager.addNextCandle();

        if (added) {
            // 追加したデータに進む
            chartManager.nextStep();
            const currentData = chartManager.updateDisplayedData();
            this.currentPrice = currentData.price;

            // ポジションがある場合は評価損益を計算
            if (this.isPositionOpen) {
                this.calculateUnrealizedProfitLoss();
            }

            this.updateUI();
        } else {
            // 追加データがなくなったらゲーム終了
            console.warn('追加データがありません。ゲーム終了します。');
            this.finishGame();
        }
    }

    // UIの更新
    updateUI() {
        // 資金情報の更新
        $('#currentCash').text(`保有資金: ${this.gameData.current_cash.toLocaleString()}円`);

        // 損益情報の更新
        const profitLossText = this.gameData.profit_loss >= 0 ?
            `利益: +${this.gameData.profit_loss.toLocaleString()}円` :
            `損失: ${this.gameData.profit_loss.toLocaleString()}円`;

        $('#profitLoss').text(profitLossText);
        $('#profitLoss').removeClass('text-success text-danger')
            .addClass(this.gameData.profit_loss >= 0 ? 'text-success' : 'text-danger');

        // ポジション情報の更新
        if (this.isPositionOpen) {
            const unrealizedPL = this.calculateUnrealizedProfitLoss();
            const positionText = this.positionType === 'buy' ? '買い' : '売り';

            $('#positionStatus').html(`
                <strong>${positionText}ポジション</strong><br>
                <small>数量: ${this.positionQuantity}株</small>
            `);

            $('#positionDetails').html(`
                取得価格: ${this.entryPrice.toLocaleString()}円<br>
                評価損益: <span class="${unrealizedPL >= 0 ? 'text-success' : 'text-danger'}">
                    ${unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toLocaleString()}円
                </span>
            `);

            // 利確セクションの表示
            $('#closePositionSection').show();
            $('#positionInfo').text(`現在価格: ${this.currentPrice.toLocaleString()}円`);
        } else {
            $('#positionStatus').text('ポジションなし');
            $('#positionDetails').empty();
            $('#closePositionSection').hide();
        }

        // 15:30で「次の5分へ進む」ボタンを非表示にする
        const currentTime = $('#timeInfo').text();
        if (currentTime.includes('15:30')) {
            $('#nextStepBtn').hide();
        } else {
            $('#nextStepBtn').show();
        }

        // ゲーム終了チェック
        if (chartManager && chartManager.isGameFinished()) {
            $('#nextStepBtn').prop('disabled', true).text('ゲーム終了');
        }
    }

    // インジケーター表示の切り替え
    toggleIndicators() {
        if (!chartManager) return;

        const option = chartManager.chart.getOption();
        const isVisible = option.series[1].lineStyle.opacity > 0; // MA5の透明度で判定

        // すべてのインジケーターの表示/非表示を切り替え
        const newOpacity = isVisible ? 0 : 0.5;

        option.series[1].lineStyle.opacity = newOpacity; // MA5
        option.series[2].lineStyle.opacity = newOpacity; // MA25

        // 凡例の表示状態も更新
        option.legend.data.forEach((name, index) => {
            if (name === 'MA5' || name === 'MA25') {
                option.legend.selected = option.legend.selected || {};
                option.legend.selected[name] = !isVisible;
            }
        });

        // ボタンのテキストを更新
        $('#toggleIndicators').text(isVisible ? 'インジケーター表示' : 'インジケーター非表示');

        chartManager.chart.setOption(option);
    }

    // ゲーム終了処理
    finishGame() {
        // 確認ダイアログを表示
        const confirmResult = confirm('ゲームを終了して結果画面に移動しますか？\n\n現在の資産: ' + this.gameData.current_cash.toLocaleString() + '円\n損益: ' + (this.gameData.profit_loss >= 0 ? '+' : '') + this.gameData.profit_loss.toLocaleString() + '円');

        if (!confirmResult) {
            return; // キャンセルされた場合は何もしない
        }

        // ポジションがある場合は決済する
        if (this.isPositionOpen) {
            this.closePosition();
        }

        // 最終損益の計算
        const finalAssets = this.gameData.current_cash;
        const totalProfitLoss = this.gameData.profit_loss;

        // ランキングデータをデータベースに登録
        $.ajax({
            url: 'api/save_result.php',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                username: this.gameData.username,
                twitter_username: this.gameData.twitter_username,
                final_assets: finalAssets,
                profit_loss: totalProfitLoss
            }),
            success: (response) => {
                if (response.success) {
                    console.log('ランキングデータを登録しました');
                } else {
                    console.error('ランキングデータの登録に失敗しました:', response.error);
                }
            },
            error: () => {
                console.error('ランキングデータの登録に失敗しました');
            }
        });

        // セッションデータの更新（サーバーに保存）
        $.ajax({
            url: 'api/update_session.php',
            type: 'POST',
            data: {
                current_cash: finalAssets,
                profit_loss: totalProfitLoss
            },
            success: (response) => {
                if (response.success) {
                    console.log('セッションデータを更新しました');
                } else {
                    console.error('セッションデータの更新に失敗しました:', response.error);
                }
            },
            error: () => {
                console.error('セッションデータの更新に失敗しました');
            }
        });

        // 結果画面へリダイレクト
        setTimeout(() => {
            window.location.href = 'result.php';
        }, 1000);
    }
}

// グローバルゲームマネージャーインスタンス
let gameManager = null;

// ページ読み込み時の初期化
$(document).ready(function() {
    if (typeof gameData !== 'undefined') {
        gameManager = new GameManager(gameData);
    }
});
