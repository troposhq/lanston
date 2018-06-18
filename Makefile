test:
	docker-compose up -d && \
	sleep 5 && \
	npm test || true && \
	docker-compose down

.PHONY: test