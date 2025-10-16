<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // データベース接続
    $db = new PDO('sqlite:../data/prices.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ランキングデータの取得（最終資産額の高い順、最新のデータを優先）
    $stmt = $db->query("
        SELECT
            username,
            twitter_username,
            final_assets,
            profit_loss,
            rating,
            created_at
        FROM rankings
        ORDER BY final_assets DESC, created_at DESC
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
