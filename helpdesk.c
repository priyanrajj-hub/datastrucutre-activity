#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ====================================================================
 * CAMPUS HELPDESK MANAGEMENT SYSTEM (C Implementation)
 * Data Structure Used: Linked-List based Queue (FIFO)
 * ==================================================================== */

// 1. Define the Node for our Queue Data Structure
typedef struct Request {
    char requestId[20];
    char studentName[50];
    char problemType[50];
    struct Request* next;
} Request;

// Global pointers for the Queue
Request* front = NULL;
Request* rear = NULL;
int counter = 1; // Auto-increments to create unique REQ-0001 IDs

// Helper function to clear input buffer to prevent scanf skipping
void clearBuffer() {
    int c;
    while ((c = getchar()) != '\n' && c != EOF) {}
}

// Requirement 1: Add a new request (Enqueue)
void addRequest() {
    Request* newReq = (Request*)malloc(sizeof(Request));
    if (!newReq) {
        printf("\n❌ Memory allocation failed!\n");
        return;
    }

    // Auto-generate Request ID (e.g., REQ-0001)
    sprintf(newReq->requestId, "REQ-%04d", counter++);
    
    printf("\nEnter Student Name: ");
    clearBuffer();
    scanf("%[^\n]s", newReq->studentName);
    
    printf("\nProblem Types:\n");
    printf("1. Lab equipment issue\n");
    printf("2. Wi-Fi problem\n");
    printf("3. ID card issue\n");
    printf("4. Classroom issue\n");
    printf("5. Other requests\n");
    printf("Select Problem Type (1-5): ");
    
    int choice;
    scanf("%d", &choice);
    
    switch(choice) {
        case 1: strcpy(newReq->problemType, "Lab equipment issue"); break;
        case 2: strcpy(newReq->problemType, "Wi-Fi problem"); break;
        case 3: strcpy(newReq->problemType, "ID card issue"); break;
        case 4: strcpy(newReq->problemType, "Classroom issue"); break;
        case 5: strcpy(newReq->problemType, "Other requests"); break;
        default: strcpy(newReq->problemType, "Unknown issue"); break;
    }
    
    newReq->next = NULL;

    // FIFO Logic: Insert at the rear of the Queue
    if (rear == NULL) {
        front = rear = newReq;
    } else {
        rear->next = newReq;
        rear = newReq;
    }
    
    printf("\n✅ Request %s Added Successfully!\n", newReq->requestId);
}

// Requirement 2: Process/remove a request (Dequeue)
void processRequest() {
    // Underflow check
    if (front == NULL) {
        printf("\n📭 Queue is empty! No requests to process.\n");
        return;
    }
    
    // Remove from the front of the queue
    Request* temp = front;
    printf("\n🛠️  Processing Request: %s | %s | %s\n", temp->requestId, temp->studentName, temp->problemType);
    
    front = front->next;
    
    // If we removed the last element, reset rear pointer too
    if (front == NULL) {
        rear = NULL;
    }
    
    free(temp); // Free allocated memory to prevent leaks
    printf("✅ Request successfully resolved and removed from queue.\n");
}

// Requirement 3: Search for a request using Request ID
void searchRequest() {
    if (front == NULL) {
        printf("\n📭 Queue is empty! Nothing to search.\n");
        return;
    }
    
    char searchId[20];
    printf("\nEnter Request ID to search (e.g., REQ-0001): ");
    scanf("%s", searchId);

    // Linear search traversal through the Linked List
    Request* temp = front;
    int position = 1;
    
    while (temp != NULL) {
        if (strcmp(temp->requestId, searchId) == 0) {
            printf("\n🔍 Request Found at Position %d in Queue!\n", position);
            printf("----------------------------------------\n");
            printf("Request ID   : %s\n", temp->requestId);
            printf("Student Name : %s\n", temp->studentName);
            printf("Problem Type : %s\n", temp->problemType);
            printf("----------------------------------------\n");
            return;
        }
        temp = temp->next;
        position++;
    }
    
    printf("\n❌ Request ID '%s' not found in the active queue.\n", searchId);
}

// Requirement 4: Display the current requests
void displayRequests() {
    if (front == NULL) {
        printf("\n📭 The Queue is currently empty.\n");
        return;
    }
    
    Request* temp = front;
    printf("\n=========== CURRENT ACTIVE QUEUE ===========\n");
    int pos = 1;
    while (temp != NULL) {
        printf("%d. [%s] %s -> %s\n", pos, temp->requestId, temp->studentName, temp->problemType);
        temp = temp->next;
        pos++;
    }
    printf("============================================\n");
}

int main() {
    int choice;
    
    while (1) {
        printf("\n============================================\n");
        printf("    CAMPUS HELPDESK MANAGEMENT SYSTEM\n");
        printf("============================================\n");
        printf("1. Add a new request -> (Enqueue)\n");
        printf("2. Process request   -> (Dequeue)\n");
        printf("3. Search request    -> (Linear Search)\n");
        printf("4. Display requests  -> (Traversal)\n");
        printf("5. Exit Program\n");
        printf("--------------------------------------------\n");
        printf("Enter your choice: ");
        
        if (scanf("%d", &choice) != 1) {
            printf("Invalid input! Exiting.\n");
            break;
        }
        
        switch (choice) {
            case 1: addRequest(); break;
            case 2: processRequest(); break;
            case 3: searchRequest(); break;
            case 4: displayRequests(); break;
            case 5: 
                printf("\nExiting Helpdesk System. Goodbye!\n"); 
                return 0;
            default:
                printf("\n❌ Invalid choice! Please select 1-5.\n");
        }
    }
    
    return 0;
}
