<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POSTメソッドのみ許可されています']);
    exit;
}

session_start();

// セッションデータの確認
if (!isset($_SESSION['game_data'])) {
    echo json_encode(['success' => false, 'error' => 'ゲームデータが見つかりません']);
    exit;
}

try {
    // 入力データの取得
    $current_cash = isset($_POST['current_cash']) ? (int)$_POST['current_cash'] : null;
    $profit_loss = isset($_POST['profit_loss']) ? (int)$_POST['profit_loss'] : null;

    // バリデーション
    if ($current_cash === null || $profit_loss === null) {
        throw new Exception('必須パラメータが不足しています');
    }

    // セッションデータの更新
    $_SESSION['game_data']['current_cash'] = $current_cash;
    $_SESSION['game_data']['profit_loss'] = $profit_loss;

    echo json_encode([
        'success' => true,
        'message' => 'セッションデータを更新しました',
        'data' => [
            'current_cash' => $current_cash,
            'profit_loss' => $profit_loss
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
