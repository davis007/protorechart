<?php
// データベース初期化スクリプト

try {
    // SQLiteデータベースに接続
    $db = new PDO('sqlite:data/prices.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 銘柄マスタテーブルの作成
    $db->exec("
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            market TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // 株価データテーブルの作成
    $db->exec("
        CREATE TABLE IF NOT EXISTS stock_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_code TEXT NOT NULL,
            datetime TEXT NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(company_code, datetime)
        )
    ");

    // ランキングテーブルの作成
    $db->exec("
        CREATE TABLE IF NOT EXISTS rankings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            twitter_username TEXT,
            final_assets INTEGER NOT NULL,
            profit_loss INTEGER NOT NULL,
            rating INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // インデックスの作成
    $db->exec("CREATE INDEX IF NOT EXISTS idx_stock_prices_code_datetime ON stock_prices(company_code, datetime)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_rankings_assets ON rankings(final_assets DESC)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_rankings_created ON rankings(created_at DESC)");

    echo "データベースの初期化が完了しました\n";
    echo "- companies テーブル: 銘柄マスタ\n";
    echo "- stock_prices テーブル: 株価データ（5分足）\n";
    echo "- rankings テーブル: ランキングデータ\n";

} catch (PDOException $e) {
    echo "データベースエラー: " . $e->getMessage() . "\n";
}
?>
