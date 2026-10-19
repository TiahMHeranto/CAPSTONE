FROM apache/superset:4.1.4

USER root
COPY superset_config.py brancher_bi.py /app/pythonpath/
COPY entree.sh /entree.sh
RUN sed -i 's/\r$//' /entree.sh \
    && chmod 755 /entree.sh \
    && pip install --no-cache-dir psycopg2-binary==2.9.10 \
    && mkdir -p /app/superset_home \
    && chown -R superset:superset /app/pythonpath /app/superset_home
USER superset

EXPOSE 8088
ENTRYPOINT ["/entree.sh"]
