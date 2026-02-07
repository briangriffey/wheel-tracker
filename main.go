package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/wheeltracker/wheeltracker/positions"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	apiURL := os.Getenv("POSITION_API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8081"
	}

	// Initialize position integration service
	positionSvc := positions.NewService(apiURL)

	// Set up router
	r := mux.NewRouter()

	// Health check endpoint
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Position endpoints
	r.HandleFunc("/api/positions", positionSvc.GetPositions).Methods("GET")
	r.HandleFunc("/api/positions/{id}", positionSvc.GetPosition).Methods("GET")
	r.HandleFunc("/ws/positions", positionSvc.WebSocketHandler).Methods("GET")

	log.Printf("Position Management Integration Service starting on port %s", port)
	log.Printf("Connecting to Position API at %s", apiURL)

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
