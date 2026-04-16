import duckdb
try:
    con = duckdb.connect('data/analytics/company_1.db')
    print('=== BI REPORTS ===')
    print(con.execute('SELECT * FROM bi_reports').df())
except Exception as e:
    print(e)
