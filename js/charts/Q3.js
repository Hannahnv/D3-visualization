// Hàm render biểu đồ
export function render(data) {
    // Xử lý dữ liệu: Tổng doanh số theo tháng
    const processedData = d3.rollup(
        data,
        (v) => d3.sum(v, (d) => +d["Thành tiền"]), // Tính tổng doanh số cho mỗi nhóm
        (d) => new Date(d["Thời gian tạo đơn"]).getMonth() + 1 // Nhóm theo tháng (1-12)
    );

    // Chuyển dữ liệu sang dạng mảng để vẽ biểu đồ
    const aggregatedData = Array.from(processedData, ([month, total]) => ({
        month,
        total,
    })).sort((a, b) => a.month - b.month); // Sắp xếp theo tháng tăng dần

    const colorScale = d3.scaleOrdinal()
        .domain(aggregatedData.map(d => d.month))
        .range(d3.schemePaired); // Màu sắc cho từng tháng

    // Cấu hình kích thước biểu đồ
    const width = 900;
    const height = 500;
    const margin = { top: 70, right: 50, bottom: 50, left: 250 };

    // Tạo SVG container
    const svg = d3
        .select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("font-family", "Arial, sans-serif")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thiết lập thang đo cho trục x (Tháng)
    const xScale = d3.scaleBand()
        .domain(aggregatedData.map((d) => `Tháng ${d.month.toString().padStart(2, "0")}`)) // Gắn nhãn Tháng 01, Tháng 02,...
        .range([0, width])
        .padding(0.2); // Khoảng cách giữa các cột

    // Thiết lập thang đo cho trục y (Doanh số)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, (d) => d.total)])
        .nice() // Giá trị tối đa của Doanh số
        .range([height, 0]);

    // Thêm tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif");


    svg
        .selectAll(".bar")
        .data(aggregatedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(`Tháng ${d.month.toString().padStart(2, "0")}`)) // Vị trí theo trục x
        .attr("y", (d) => yScale(d.total)) // Vị trí theo trục y (đỉnh của cột)
        .attr("width", xScale.bandwidth()) // Độ rộng cột
        .attr("height", (d) => height - yScale(d.total)) // Chiều cao cột
        .attr("fill", d => colorScale(d.month)) // Màu sắc cột
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").html(`
                <strong>Tháng ${d.month}</strong><br>
                <strong>Doanh số:</strong> ${d3.format(",")(d.total)} VND
            `);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("top", `${event.pageY - 40}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    
        // Thêm label giá trị trên các cột
    svg
    .selectAll(".label")
    .data(aggregatedData)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", (d) => xScale(`Tháng ${d.month.toString().padStart(2, "0")}`) + xScale.bandwidth() / 2) // Canh giữa mỗi cột
    .attr("y", (d) => yScale(d.total) - 5) // Đặt label ngay trên đỉnh cột
    .style("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", "black") // Màu chữ
    .text((d) => {
        const value = d.total;
        if (value >= 1e9) {
            return `${Math.round(value / 1e9)} tỷ VND`; // Ví dụ: 1,200,000,000 => 1.2 tỷ VND
        } else if (value >= 1e6) {
            return `${Math.round(value / 1e6)} triệu VND`; // Ví dụ: 626,000,000 => 626 triệu VND
        } else {
            return `${Math.round(value / 1e3)} nghìn VND`; // Ví dụ: 25,000 => 25 nghìn VND
        }
    });


    // Thêm tiêu đề
    svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .style("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng theo Tháng");

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`) // Đưa trục x xuống đáy
        .call(d3.axisBottom(xScale))
        .selectAll("text") // Định dạng nhãn
        .style("text-anchor", "middle");

    // Vẽ trục y
    svg.append("g")
    .call(d3.axisLeft(yScale)
    .tickFormat(d => `${d / 1e6}M`))
    .style("font-size", "12px");
}