// Hàm load chart khi click nút
async function loadChart(chartName) {
    try {
        // 1. Xóa nội dung chart cũ
        d3.select("#chart-container").html(""); 

        // 2. Load module chart (ví dụ: Q1.js)
        const chartModule = await import(`./charts/${chartName}.js`);
        
        // 3. Load file CSV từ thư mục data/
        d3.csv("data/data.csv").then(data => {
        // 4. Gọi hàm render của chart và truyền data vào
            chartModule.render(data);
        });
    } catch (error) {
        console.error("Lỗi:", error);
    }
}