<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ランキング - プロトレチャート</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <!-- ヘッダー -->
        <div class="text-center mb-5">
            <h1 class="display-4 text-primary">プロトレチャート</h1>
            <p class="lead">ランキング</p>
            <a href="index.php" class="btn btn-outline-primary">トップに戻る</a>
        </div>

        <!-- ランキングテーブル -->
        <div class="card shadow">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">トッププレイヤー</h5>
            </div>
            <div class="card-body p-0">
                <div id="rankingList">
                    <!-- ランキングデータはJavaScriptで動的に読み込み -->
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="sr-only">読み込み中...</span>
                        </div>
                        <p class="mt-2">ランキングを読み込み中...</p>
                    </div>
                </div>
            </div>
        </div>

                <!-- ランキング説明 -->
                <div class="card mt-4">
                    <div class="card-body">
                        <h6>ランキングについて</h6>
                        <ul class="list-unstyled mb-0">
                            <li>✅ 最終資産額でランキングされます</li>
                            <li>✅ 1位〜5位には王冠アイコンが表示されます</li>
                            <li>✅ Xユーザー名を登録するとリンクが表示されます</li>
                            <li>✅ ゲーム終了時に自動でランキング登録されます</li>
                        </ul>
                    </div>
                </div>
    </div>

    <!-- フッター -->
    <footer class="mt-5 py-4 bg-light">
        <div class="container text-center">
            <p class="mb-0">Copyright 株式投資 しゃばぞう</p>
            <a href="https://x.com/shavadaxyz" target="_blank" class="text-muted">https://x.com/shavadaxyz</a>
        </div>
    </footer>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // ランキングデータの読み込み
        $(document).ready(function() {
            loadRanking();
        });

        function loadRanking() {
            $.ajax({
                url: 'api/get_ranking.php',
                type: 'GET',
                dataType: 'json',
                success: function(response) {
                    if (response.success && response.rankings) {
                        displayRanking(response.rankings);
                    } else {
                        $('#rankingList').html('<div class="text-center py-5 text-danger">ランキングデータの取得に失敗しました</div>');
                    }
                },
                error: function() {
                    $('#rankingList').html('<div class="text-center py-5 text-danger">ランキングの読み込みに失敗しました</div>');
                }
            });
        }

        function displayRanking(rankingData) {
            let html = '';

            if (rankingData.length === 0) {
                html = '<div class="text-center py-5 text-muted">まだランキングデータがありません</div>';
            } else {
                rankingData.forEach((player, index) => {
                    const rank = index + 1;

                    // 王冠アイコンの設定（1位〜5位のみ）
                    let crownIcon = '';
                    let rankColor = 'text-secondary';

                    if (rank === 1) {
                        crownIcon = '<i class="fas fa-crown text-gold mr-2"></i>';
                        rankColor = 'text-gold';
                    } else if (rank === 2) {
                        crownIcon = '<i class="fas fa-crown text-silver mr-2"></i>';
                        rankColor = 'text-silver';
                    } else if (rank === 3) {
                        crownIcon = '<i class="fas fa-crown text-bronze mr-2"></i>';
                        rankColor = 'text-bronze';
                    } else if (rank <= 5) {
                        crownIcon = '<i class="fas fa-crown text-warning mr-2"></i>';
                        rankColor = 'text-warning';
                    }

                    // ユーザー名が空の場合の処理
                    const displayUsername = player.username && player.username.trim() !== '' ? player.username : '名無し';

                    const twitterLink = player.twitter_username ?
                        `<a href="https://twitter.com/${player.twitter_username}" target="_blank" class="text-muted small">@${player.twitter_username}</a>` :
                        '';

                    const profitClass = player.profit_loss >= 0 ? 'text-success' : 'text-danger';
                    const profitSign = player.profit_loss >= 0 ? '+' : '';

                    html += `
                        <div class="ranking-item border-bottom p-3 ${rank <= 3 ? 'bg-light' : ''}">
                            <div class="row align-items-center">
                                <div class="col-2 col-md-1">
                                    <div class="h4 mb-0 text-center ${rankColor}">
                                        ${crownIcon}${rank}
                                    </div>
                                </div>
                                <div class="col-5 col-md-6">
                                    <div class="h6 mb-1">${displayUsername}</div>
                                    ${twitterLink}
                                </div>
                                <div class="col-5 col-md-5 text-right">
                                    <div class="small ${profitClass}">
                                        ${profitSign}${player.profit_loss.toLocaleString()}円
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            $('#rankingList').html(html);
        }
    </script>
</body>
</html>
