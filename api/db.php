<?php
try {
    $db = new PDO('sqlite:' . __DIR__ . '/../data/prices.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die('DB接続エラー: ' . $e->getMessage());
}
?>
