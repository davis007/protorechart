<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $db = new PDO('sqlite:' . dirname(__DIR__) . '/data/prices.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ランダムな銘柄を取得
    $stmt = $db->query("SELECT code, name FROM companies ORDER BY RANDOM() LIMIT 1");
    $company = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$company) {
        throw new Exception('銘柄データが見つかりません');
    }
    $code = $company['code'];
    $name = $company['name'];

    // 最新日付を取得
    $stmt = $db->prepare("SELECT DISTINCT date(datetime) as date FROM stock_prices WHERE company_code = ? ORDER BY date(datetime) DESC LIMIT 2");
    $stmt->execute([$code]);
    $dates = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (count($dates) < 2) throw new Exception('データ不足');

    $currentDate = $dates[0];
    $previousDate = $dates[1];

    // 前日データ（初期チャート用 - 後場14:15〜15:30の15本を固定背景として使用）
    $stmt = $db->prepare("SELECT datetime, open, high, low, close, volume FROM stock_prices WHERE company_code = ? AND date(datetime) = ? AND time(datetime) >= '14:15:00' AND time(datetime) <= '15:30:00' ORDER BY datetime ASC");
    $stmt->execute([$code, $previousDate]);
    $previousDayPrices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 当日データ（最初の1本だけを初期チャートに含める - 9:00のデータを取得）
    $stmt = $db->prepare("SELECT datetime, open, high, low, close, volume FROM stock_prices WHERE company_code = ? AND date(datetime) = ? AND time(datetime) >= '09:00:00' ORDER BY datetime ASC LIMIT 1");
    $stmt->execute([$code, $currentDate]);
    $currentDayFirst = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 残りの当日データ（追加分 - 9:00以降のデータを取得）
    $stmt = $db->prepare("SELECT datetime, open, high, low, close, volume FROM stock_prices WHERE company_code = ? AND date(datetime) = ? AND time(datetime) >= '09:00:00' ORDER BY datetime ASC LIMIT -1 OFFSET 1");
    $stmt->execute([$code, $currentDate]);
    $additionalPrices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // デバッグ用：データの確認
    if (empty($currentDayFirst)) {
        throw new Exception('当日のデータがありません: ' . $currentDate);
    }
    if (empty($previousDayPrices)) {
        throw new Exception('前日のデータがありません: ' . $previousDate);
    }

    // JSON出力
    echo json_encode([
        'success' => true,
        'company' => [
            'code' => $code,
            'name' => $name,
            'date' => $currentDate
        ],
        'prices' => array_map(fn($r) => [
            'time' => $r['datetime'],
            'open' => (float)$r['open'],
            'high' => (float)$r['high'],
            'low' => (float)$r['low'],
            'close' => (float)$r['close'],
            'volume' => (int)$r['volume']
        ], array_merge($previousDayPrices, $currentDayFirst)),
        'additional_prices' => array_map(fn($r) => [
            'time' => $r['datetime'],
            'open' => (float)$r['open'],
            'high' => (float)$r['high'],
            'low' => (float)$r['low'],
            'close' => (float)$r['close'],
            'volume' => (int)$r['volume']
        ], $additionalPrices)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
