#!/usr/bin/env python3
"""
株価データ取得スクリプト
YFinanceを使用して日本株の5分足データを取得し、SQLiteに保存します
"""

import yfinance as yf
import pandas as pd
import sqlite3
import csv
import os
import sys
from datetime import datetime, timedelta
import time
import random

# プロジェクトのルートディレクトリを設定
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
DB_PATH = os.path.join(DATA_DIR, 'prices.db')
COMPANY_CSV = os.path.join(DATA_DIR, 'company.csv')

def get_db_connection():
    """データベース接続を取得"""
    return sqlite3.connect(DB_PATH)

def load_companies():
    """銘柄リストを読み込み"""
    companies = []
    with open(COMPANY_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            companies.append({
                'code': row['code'],
                'name': row['name'],
                'market': row['market']
            })
    return companies

def get_japanese_stock_symbol(code):
    """日本株のYFinanceシンボルを生成"""
    return f"{code}.T"

def fetch_stock_data(symbol, period="60d", interval="5m"):
    """株価データを取得"""
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)
        return data
    except Exception as e:
        print(f"エラー: {symbol} のデータ取得に失敗 - {e}")
        return None

def save_stock_prices(company_code, data):
    """株価データをデータベースに保存"""
    conn = get_db_connection()
    cursor = conn.cursor()

    saved_count = 0
    for index, row in data.iterrows():
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO stock_prices
                (company_code, datetime, open, high, low, close, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                company_code,
                index.strftime('%Y-%m-%d %H:%M:%S'),
                float(row['Open']),
                float(row['High']),
                float(row['Low']),
                float(row['Close']),
                int(row['Volume'])
            ))
            saved_count += 1
        except Exception as e:
            print(f"エラー: データ保存に失敗 - {e}")

    conn.commit()
    conn.close()
    return saved_count

def update_companies_table(companies):
    """銘柄マスタテーブルを更新"""
    conn = get_db_connection()
    cursor = conn.cursor()

    for company in companies:
        cursor.execute("""
            INSERT OR REPLACE INTO companies (code, name, market)
            VALUES (?, ?, ?)
        """, (company['code'], company['name'], company['market']))

    conn.commit()
    conn.close()

def main():
    """メイン処理"""
    print("株価データ取得を開始します...")

    # 銘柄リストの読み込み
    companies = load_companies()
    print(f"銘柄数: {len(companies)}")

    # 銘柄マスタの更新
    update_companies_table(companies)
    print("銘柄マスタを更新しました")

    total_saved = 0
    successful_companies = []

    for i, company in enumerate(companies, 1):
        symbol = get_japanese_stock_symbol(company['code'])
        print(f"[{i}/{len(companies)}] {company['code']} {company['name']} を処理中...")

        # 株価データの取得
        data = fetch_stock_data(symbol)

        if data is not None and not data.empty:
            # データの保存
            saved_count = save_stock_prices(company['code'], data)
            total_saved += saved_count
            successful_companies.append(company['name'])
            print(f"  → {saved_count}件のデータを保存しました")
        else:
            print(f"  → データが取得できませんでした")

        # API制限を考慮して待機
        if i < len(companies):
            wait_time = random.uniform(1, 3)
            print(f"  → {wait_time:.1f}秒待機...")
            time.sleep(wait_time)

    print(f"\n処理完了:")
    print(f"成功した銘柄: {len(successful_companies)}/{len(companies)}")
    print(f"保存されたデータ数: {total_saved}")
    print(f"データベース: {DB_PATH}")

if __name__ == "__main__":
    main()
