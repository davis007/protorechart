<?php
session_start();

// ゲームデータの確認
if (!isset($_SESSION['game_data'])) {
    header('Location: index.php');
    exit;
}

$game_data = $_SESSION['game_data'];
$final_assets = $game_data['current_cash'];
$profit_loss = $game_data['profit_loss'];
$username = $game_data['username'];
$twitter_username = $game_data['twitter_username'];

// ランキング自動登録
try {
    // データベース接続
    $db = new PDO('sqlite:../data/prices.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 評価の計算（10段階）
    $profit_rate = ($profit_loss / 1000000) * 100;
    if ($profit_rate >= 15) $rating = 10;
    elseif ($profit_rate >= 10) $rating = 9;
    elseif ($profit_rate >= 5) $rating = 8;
    elseif ($profit_rate >= 2) $rating = 7;
    elseif ($profit_rate >= 0) $rating = 6;
    elseif ($profit_rate >= -2) $rating = 5;
    elseif ($profit_rate >= -5) $rating = 4;
    elseif ($profit_rate >= -10) $rating = 3;
    elseif ($profit_rate >= -15) $rating = 2;
    else $rating = 1;

    // デバッグ用：セッションデータの確認
    error_log("ランキング登録: username={$username}, twitter={$twitter_username}, assets={$final_assets}, profit={$profit_loss}");

    // ランキングデータの保存
    $stmt = $db->prepare("
        INSERT INTO rankings
        (username, twitter_username, final_assets, profit_loss, rating)
        VALUES (?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $username,
        $twitter_username ?: null,
        $final_assets,
        $profit_loss,
        $rating
    ]);

    $ranking_saved = true;
} catch (Exception $e) {
    $ranking_saved = false;
    $ranking_error = $e->getMessage();
    error_log("ランキング登録エラー: " . $e->getMessage());
}

// セッション削除（前のゲームデータをクリア）
unset($_SESSION['game_data']);

// X共有用テキストの生成
$share_text = urlencode("{$username}さんのデイトレ結果 {$profit_loss}円 でした！\n評価: {$rating}/10\n#プロトレチャート #デイトレ練習");
$share_url = "https://twitter.com/intent/tweet?text={$share_text}";

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>結果画面 - プロトレチャート</title>
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
                    <p class="lead">デイトレード結果</p>
                </div>

                <!-- 結果表示 -->
                <div class="card shadow-lg">
                    <div class="card-header bg-primary text-white text-center">
                        <h4 class="mb-0">ゲーム終了</h4>
                    </div>
                    <div class="card-body text-center py-5">
                        <!-- 最終資産 -->
                        <div class="mb-4">
                            <h2 class="text-success"><?php echo number_format($final_assets); ?>円</h2>
                            <p class="lead"><?php echo htmlspecialchars($username); ?>さんの最終資産</p>
                        </div>

                        <!-- 損益表示 -->
                        <div class="mb-4">
                            <?php if ($profit_loss >= 0): ?>
                                <h4 class="text-success">+<?php echo number_format($profit_loss); ?>円</h4>
                                <p class="text-success">利益</p>
                            <?php else: ?>
                                <h4 class="text-danger"><?php echo number_format($profit_loss); ?>円</h4>
                                <p class="text-danger">損失</p>
                            <?php endif; ?>
                        </div>

                        <!-- 評価表示 -->
                        <div class="mb-4">
                            <div class="h3 text-warning">
                                <?php for ($i = 1; $i <= 10; $i++): ?>
                                    <?php if ($i <= $rating): ?>
                                        ⭐
                                    <?php else: ?>
                                        ☆
                                    <?php endif; ?>
                                <?php endfor; ?>
                            </div>
                            <p class="text-muted">評価: <?php echo $rating; ?>/10</p>
                        </div>
                    </div>
                </div>

                <!-- ランキング登録ステータス -->
                <div class="row mt-4">
                    <div class="col-md-12 mb-3">
                        <?php if ($ranking_saved): ?>
                            <div class="alert alert-success text-center">
                                <h5 class="mb-1">✅ ランキングに自動登録しました</h5>
                                <p class="mb-0">ランキングページで順位を確認できます</p>
                            </div>
                        <?php else: ?>
                            <div class="alert alert-warning text-center">
                                <h5 class="mb-1">⚠️ ランキング登録に失敗しました</h5>
                                <p class="mb-0"><?php echo htmlspecialchars($ranking_error ?? '不明なエラー'); ?></p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- アクションボタン -->
                <div class="row mt-2">
                    <div class="col-md-6 mb-3">
                        <a href="<?php echo $share_url; ?>" target="_blank" class="btn btn-info btn-lg btn-block">
                            Xでシェアする
                        </a>
                    </div>
                    <div class="col-md-6 mb-3">
                        <a href="ranking.php" class="btn btn-primary btn-lg btn-block">
                            ランキングを見る
                        </a>
                    </div>
                </div>

                <!-- その他のアクション -->
                <div class="row mt-3">
                    <div class="col-md-12 mb-2">
                        <a href="index.php" class="btn btn-outline-secondary btn-block">
                            トップに戻る
                        </a>
                    </div>
                </div>

                <!-- ユーザー情報 -->
                <div class="card mt-4">
                    <div class="card-body text-center">
                        <p class="mb-1">プレイヤー: <strong><?php echo htmlspecialchars($username); ?></strong></p>
                        <?php if (!empty($twitter_username)): ?>
                            <p class="mb-0 text-muted">
                                X: <a href="https://twitter.com/<?php echo htmlspecialchars($twitter_username); ?>" target="_blank">@<?php echo htmlspecialchars($twitter_username); ?></a>
                            </p>
                        <?php endif; ?>
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
</body>
</html>
