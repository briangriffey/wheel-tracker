.PHONY: build run test clean docker-build docker-up docker-down

build:
	go build -o wheeltracker .

run:
	go run main.go

test:
	go test ./... -v

clean:
	rm -f wheeltracker
	go clean

docker-build:
	docker build -t wheeltracker:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f integration

lint:
	golangci-lint run || go fmt ./...

deps:
	go mod download
	go mod tidy
