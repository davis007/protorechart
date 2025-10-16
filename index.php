<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プロトレチャート - デイトレ練習ゲーム</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <!-- ヘッダー -->
                <div class="text-center mb-5">
                    <h1 class="display-4 text-primary">プロトレチャート</h1>
                    <p class="lead">デイトレード練習ブラウザゲーム</p>
                </div>

                <!-- ランキングリンク -->
                <div class="text-center mb-4">
                    <a href="ranking.php" class="btn btn-outline-primary">ランキングを見る</a>
                </div>

                <!-- ユーザー登録フォーム -->
                <div class="card shadow">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">ゲームスタート</h5>
                    </div>
                    <div class="card-body">
                        <form id="startForm" action="game.php" method="POST">
                            <div class="form-group">
                                <label for="username">ユーザーネーム</label>
                                <input type="text" class="form-control" id="username" name="username" required maxlength="20" placeholder="あなたのユーザーネーム">
                            </div>
                            <div class="form-group">
                                <label for="twitter_username">X（Twitter）ユーザーネーム</label>
                                <div class="input-group">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">@</span>
                                    </div>
                                    <input type="text" class="form-control" id="twitter_username" name="twitter_username" maxlength="15" placeholder="ユーザー名（@は不要）">
                                </div>
                                <small class="form-text text-muted">ランキングに表示されます（任意）</small>
                            </div>
                            <button type="submit" class="btn btn-primary btn-lg btn-block mt-4">ゲームスタート</button>
                        </form>
                    </div>
                </div>

                <!-- ゲーム説明 -->
                <div class="card mt-4">
                    <div class="card-body">
                        <h5>ゲームのルール</h5>
                        <ul class="list-unstyled">
                            <li>✅ 初期資金：100万円</li>
                            <li>✅ 信用取引：売り・買い両方可能</li>
                            <li>✅ 単元株数：100株単位</li>
                            <li>✅ 5分足チャートでリアルタイム進行</li>
                            <li>✅ ランキング登録で競おう！</li>
                        </ul>
                    </div>
                </div>
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
        $(document).ready(function() {
            // Cookieからユーザー情報を読み込む
            function loadUserInfoFromCookies() {
                const username = getCookie('protorechart_username');
                const twitterUsername = getCookie('protorechart_twitter_username');

                if (username) {
                    $('#username').val(username);
                }
                if (twitterUsername) {
                    $('#twitter_username').val(twitterUsername);
                }
            }

            // フォーム送信時にCookieに保存
            $('#startForm').on('submit', function() {
                const username = $('#username').val();
                const twitterUsername = $('#twitter_username').val();

                // Cookieに保存（30日間有効）
                setCookie('protorechart_username', username, 30);
                if (twitterUsername) {
                    setCookie('protorechart_twitter_username', twitterUsername, 30);
                } else {
                    deleteCookie('protorechart_twitter_username');
                }
            });

            // Cookie操作関数
            function setCookie(name, value, days) {
                const expires = new Date();
                expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
                document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/';
            }

            function getCookie(name) {
                const nameEQ = name + '=';
                const ca = document.cookie.split(';');
                for (let i = 0; i < ca.length; i++) {
                    let c = ca[i];
                    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
                }
                return null;
            }

            function deleteCookie(name) {
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            }

            // ページ読み込み時にCookieから情報を読み込む
            loadUserInfoFromCookies();
        });
    </script>
</body>
</html>
