<?php
// ユーザーデータの受け取り
$username = $_POST['username'] ?? '';
$twitter_username = $_POST['twitter_username'] ?? '';

if (empty($username)) {
    header('Location: index.php');
    exit;
}

// ゲーム初期化
session_start();
if (!isset($_SESSION['game_data'])) {
    $_SESSION['game_data'] = [
        'username' => $username,
        'twitter_username' => $twitter_username,
        'initial_cash' => 1000000,
        'current_cash' => 1000000,
        'stocks' => 0,
        'position' => null, // 'buy' or 'sell'
        'entry_price' => 0,
        'current_step' => 0,
        'company_code' => '',
        'company_name' => '',
        'game_date' => date('Y/m/d'),
        'profit_loss' => 0
    ];
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ゲーム画面 - プロトレチャート</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
    <style>
        /* チャートサイズのレスポンシブ対応 */
        .chart-main {
            width: calc(100% - 20px);
            height: 500px;
        }
        .chart-indicator {
            width: calc(100% - 20px);
            height: 250px;
        }
        .chart-indicator-small {
            width: calc(100% - 20px);
            height: 200px;
        }
        .chart-indicator-small:last-of-type {
            height: 205px; /* 最下部チャートを5px大きく */
        }
        .chart-rci {
            width: calc(100% - 15px) !important; /* RCIの幅を少し調整 */
        }

        /* インジケーター非表示時のスタイル（全デバイス共通） */
        #indicatorToggles.hidden {
            display: none !important;
        }

        /* スマホ対応 */
        @media (max-width: 768px) {
            .chart-main {
                height: 350px;
            }
            .chart-indicator {
                height: 175px; /* メインチャートの半分 */
            }
            .chart-indicator-small {
                height: 175px; /* メインチャートの半分 */
            }

            /* インジケーターチェックボックスを縦並びに */
            #indicatorToggles label {
                display: block;
                margin-bottom: 5px;
            }
        }

        /* タブレット対応 */
        @media (min-width: 769px) and (max-width: 1024px) {
            .chart-main {
                height: 450px;
            }
            .chart-indicator {
                height: 220px;
            }
            .chart-indicator-small {
                height: 180px;
            }
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <!-- ヘッダー情報 -->
        <div class="row bg-light py-2 border-bottom">
            <div class="col-md-4">
                <h5 class="mb-0"><a href="index.php">プロトレチャート</a></h5>
                <small class="text-muted"><?php echo htmlspecialchars($username); ?></small>
            </div>
            <div class="col-md-4 text-center">
                <div id="companyInfo" class="h6 mb-0">銘柄情報読み込み中...</div>
                <div id="timeInfo" class="small text-muted">時間: 9:00</div>
            </div>
            <div class="col-md-4 text-right">
                <div class="h6 mb-0" id="currentCash">保有資金: 1,000,000円</div>
                <div class="small" id="profitLoss">損益: 0円</div>
            </div>
        </div>

        <!-- メインコンテンツ -->
        <div class="row mt-3">
            <!-- チャート表示エリア -->
            <div class="col-lg-9">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">チャート</h6>
                        <div>
                            <button class="btn btn-sm btn-outline-secondary" id="toggleIndicators">インジケーター表示</button>
                        </div>
                    </div>
                    <!-- テクニカル切替 -->
                    <div class="card-body py-2 border-bottom">
                        <div id="indicatorToggles" class="mb-2 hidden">
                            <label class="mr-2"><input type="checkbox" class="indicator-toggle" data-key="MA5" checked> MA5</label>
                            <label class="mr-2"><input type="checkbox" class="indicator-toggle" data-key="MA25" checked> MA25</label>
                            <label class="mr-2"><input type="checkbox" class="indicator-toggle" data-key="BB"> BB(σ2)</label>
                            <label class="mr-2"><input type="checkbox" class="indicator-toggle" data-key="MACD"> MACD</label>
                            <label class="mr-2"><input type="checkbox" class="indicator-toggle" data-key="RSI"> RSI</label>
                            <label class="mr-2"><input type="checkbox" class="indicator-toggle" data-key="RCI"> RCI</label>
                        </div>
                    </div>
                    <div class="card-body" style="padding: 0; padding-bottom: 20px;">
                        <div id="chartContainer" class="chart-main"></div>
                        <div id="macdContainer" class="chart-indicator" style="display: none; border-top: 1px solid #2B2B43;"></div>
                        <div id="rsiContainer" class="chart-indicator-small" style="display: none; border-top: 1px solid #2B2B43;"></div>
                        <div id="rciContainer" class="chart-indicator-small chart-rci" style="display: none; border-top: 1px solid #2B2B43;"></div>
                    </div>
                </div>
            </div>

            <!-- 取引パネル -->
            <div class="col-lg-3">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">取引</h6>
                    </div>
                    <div class="card-body">
                        <!-- 現在価格表示 -->
                        <div class="text-center mb-3">
                            <div class="h4 text-primary" id="currentPrice">---</div>
                            <small class="text-muted">現在価格</small>
                        </div>

                        <!-- 株数選択 -->
                        <div class="form-group">
                            <label for="stockQuantity">株数（100株単位）</label>
                            <select class="form-control" id="stockQuantity">
                                <option value="100">100株</option>
                                <option value="200">200株</option>
                                <option value="300">300株</option>
                                <option value="400">400株</option>
                                <option value="500">500株</option>
                            </select>
                        </div>

                        <!-- 取引ボタン -->
                        <div class="btn-group-vertical w-100 mb-3">
                            <button class="btn btn-success btn-lg" id="buyBtn">買い</button>
                            <button class="btn btn-danger btn-lg" id="sellBtn">売り</button>
                        </div>

                        <!-- 利確ボタン（保有時のみ表示） -->
                        <div id="closePositionSection" style="display: none;">
                            <button class="btn btn-info btn-block" id="closePositionBtn">利確</button>
                            <div class="mt-2 text-center">
                                <small id="positionInfo" class="text-muted"></small>
                            </div>
                        </div>

                        <!-- 次の時間へ進むボタン -->
                        <button class="btn btn-primary btn-block mt-3" id="nextStepBtn" disabled>次の5分へ進む</button>

                        <!-- ゲーム終了ボタン -->
                        <button class="btn btn-warning btn-block mt-2" id="finishGameBtn">ゲーム終了</button>
                    </div>
                </div>

                <!-- 保有情報 -->
                <div class="card mt-3">
                    <div class="card-header">
                        <h6 class="mb-0">保有情報</h6>
                    </div>
                    <div class="card-body">
                        <div id="positionStatus">ポジションなし</div>
                        <div id="positionDetails" class="small text-muted mt-1"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 外部ライブラリ -->
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>

    <!-- アプリケーションスクリプト -->
    <script src="assets/js/chart.js"></script>
    <script src="assets/js/main.js"></script>

    <script>
        // Lightweight Chartsライブラリの読み込み確認
        window.addEventListener('load', function() {
            console.log('LightweightCharts available:', typeof LightweightCharts !== 'undefined');
            if (typeof LightweightCharts !== 'undefined') {
                console.log('LightweightCharts version:', LightweightCharts.version || 'unknown');
            }
        });

        // インジケーター表示ボタンの機能
        $(document).ready(function() {
            let indicatorsVisible = false; // 初期状態は非表示

            $('#toggleIndicators').click(function() {
                indicatorsVisible = !indicatorsVisible;
                const $indicatorToggles = $('#indicatorToggles');
                const $button = $(this);

                if (indicatorsVisible) {
                    $indicatorToggles.removeClass('hidden');
                    $button.text('インジケーター非表示');
                    $button.removeClass('btn-outline-secondary').addClass('btn-secondary');
                } else {
                    $indicatorToggles.addClass('hidden');
                    $button.text('インジケーター表示');
                    $button.removeClass('btn-secondary').addClass('btn-outline-secondary');
                }
            });
        });

        // ゲームデータの初期化
        const gameData = <?php echo json_encode($_SESSION['game_data']); ?>;
    </script>
</body>
</html>
