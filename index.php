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

    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
