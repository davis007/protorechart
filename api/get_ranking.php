<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // データベース接続
    $db = new PDO('sqlite:../data/prices.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ランキングデータの取得（同一ユーザーの最高成績のみ表示）
    $stmt = $db->query("
        SELECT
            r1.username,
            r1.twitter_username,
            r1.final_assets,
            r1.profit_loss,
            r1.rating,
            r1.created_at
        FROM rankings r1
        WHERE r1.final_assets = (
            SELECT MAX(r2.final_assets)
            FROM rankings r2
            WHERE r2.username = r1.username
            AND (r2.twitter_username = r1.twitter_username OR (r2.twitter_username IS NULL AND r1.twitter_username IS NULL))
        )
        GROUP BY r1.username, r1.twitter_username
        ORDER BY r1.final_assets DESC, r1.created_at DESC
        LIMIT 50
    ");

    $rankings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // レスポンスデータの整形
    $response = [
        'success' => true,
        'rankings' => []
    ];

    foreach ($rankings as $ranking) {
        $response['rankings'][] = [
            'username' => $ranking['username'],
            'twitter_username' => $ranking['twitter_username'],
            'final_assets' => (int)$ranking['final_assets'],
            'profit_loss' => (int)$ranking['profit_loss'],
            'rating' => (int)$ranking['rating'],
            'created_at' => $ranking['created_at']
        ];
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
