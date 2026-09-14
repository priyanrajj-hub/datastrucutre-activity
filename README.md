# 🎓 Campus Helpdesk Management System

![C](https://img.shields.io/badge/C-00599C?style=for-the-badge&logo=c&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

A comprehensive Data Structures project utilizing an active **Linked-List Queue (FIFO)** to securely manage and process campus helpdesk requests (Lab equipment, Wi-Fi, ID issues, etc.).

This project contains two key components: the **Core C Implementation** (for the academic assignment) and a **3D Web Visualizer** (to interactively demonstrate how the hardware memory and pointers work).

---

## 💻 1. Core Implementation (C Language)

The main backend logic requirement is met in the pure `helpdesk.c` file. This is a terminal-based interface interacting efficiently via a custom `Request` struct node system mapping a dynamic Linked List.

### 📋 Features

- **Add Request (Enqueue):** Allocates memory for a new request dynamically and inserts it at the O(1) Rear of the Queue.
- **Process Request (Dequeue):** Resolves the request at the O(1) Front of the Queue, freeing the memory layout cleanly to prevent leaks.
- **Search Request:** O(N) Traversal mapping to search active jobs by their Request ID.
- **Display Requests:** Sequentially traces memory pointers from `FRONT` to `REAR`.

### 🚀 How to Run the C Program

1. Open your terminal or command prompt.
2. Compile the code using GCC:

   ```bash
   gcc helpdesk.c -o helpdesk
   ```

3. Run the executable:

   ```bash
   ./helpdesk
   ```

   *(Alternatively, run it instantly on a browser compiler like [OnlineGDB](https://www.onlinegdb.com/online_c_compiler))*

---

## 🌐 2. Interactive 3D Web Visualizer

To act as a visual aid to the C logic, the front-end uses Vanilla JS and CSS 3D Transforms to literally map out the Linked List exactly as it operates in memory.

**🔗 Live Demo:** [View Website Here](https://datastrucutre-activity.vercel.app/)

### 🔍 Visualization Features

- **Physical Memory Mapping:** Generates pseudo-random Hex hardware addresses (e.g., `0x32A4`) for every node.
- **Pointer Connectivity:** Displays explicit visual UI bridging between a node's `Next` pointer and the target memory address.
- **Array Interaction:** Includes a bottom panel highlighting Hardware Hash Map buckets operating concurrently with the Queue.

---

## 📂 Project Structure

```text
📦 datastructure-activity
 ┣ 📜 helpdesk.c      # Primary C Console Application
 ┣ 📜 index.html      # Visualizer Frontend UI 
 ┣ 📜 style.css       # 3D Transforms & Theming
 ┣ 📜 app.js          # JS Queue Logic & Pointer Rendering
 ┗ 📜 README.md       # Project Documentation
```

## 👩‍💻 Author

Developed for Data Structures Academic Submission.
