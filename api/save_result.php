<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POSTメソッドのみ許可されています']);
    exit;
}

try {
    // 入力データの取得
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('無効なJSONデータです');
    }

    $required_fields = ['username', 'final_assets', 'profit_loss'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field])) {
            throw new Exception("必須フィールド {$field} がありません");
        }
    }

    $username = trim($input['username']);
    $twitter_username = isset($input['twitter_username']) ? trim($input['twitter_username']) : '';
    $final_assets = (int)$input['final_assets'];
    $profit_loss = (int)$input['profit_loss'];

    // バリデーション
    if (empty($username)) {
        throw new Exception('ユーザーネームは必須です');
    }

    if (strlen($username) > 20) {
        throw new Exception('ユーザーネームは20文字以内で入力してください');
    }

    if ($twitter_username && strlen($twitter_username) > 15) {
        throw new Exception('Xユーザーネームは15文字以内で入力してください');
    }

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

    // データベース接続
    require_once __DIR__ . '/db.php';

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

    echo json_encode([
        'success' => true,
        'message' => 'ランキングに登録しました',
        'rating' => $rating
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
