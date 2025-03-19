export function render(data) {
    // Xử lý dữ liệu
    const processedData = d3.rollup(
        data,
        (v) => {
            const totalRevenue = d3.sum(v, (d) => +d["Thành tiền"]); // Tổng doanh số
            const uniqueDays = new Set(v.map((d) => new Date(d["Thời gian tạo đơn"]).toDateString())).size; // Số ngày duy nhất
            const avgRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0; // Doanh số trung bình theo ngày
            return avgRevenue;
        },
        (d) => new Date(d["Thời gian tạo đơn"]).getDate() // Nhóm theo ngày trong tháng
    );

    // Chuyển đổi dữ liệu sang mảng và sắp xếp theo ngày trong tháng
    const aggregatedData = Array.from(processedData, ([day, avgRevenue]) => ({
        day,
        avgRevenue
    })).sort((a, b) => a.day - b.day);

    // Thang đo màu
    const colorScale = d3.scaleOrdinal()
        .domain(aggregatedData.map((d) => d.day))
        .range(d3.schemeTableau10);

    // Cấu hình kích thước biểu đồ
    const width = 900;
    const height = 500;
    const margin = { top: 60, right: 50, bottom: 80, left: 250 };

    // Tạo SVG container
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("font-family", "Arial, sans-serif")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo trục x (Ngày trong tháng)
    const xScale = d3.scaleBand()
        .domain(aggregatedData.map((d) => d.day))
        .range([0, width])
        .padding(0.2);

    // Thang đo trục y (Doanh số trung bình)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, (d) => d.avgRevenue)])
        .nice()
        .range([height, 0]);

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat((d) => `Ngày ${String(d).padStart(2, "0")}`))
        .selectAll("text")
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .attr("x", -10)
        .attr("y", -10);

    // Vẽ trục y
    svg.append("g")
        .call(
            d3.axisLeft(yScale).tickFormat((d) => `${(d / 1e6).toFixed(0)}M`) // Hiển thị doanh số theo triệu VND
        );

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif");

    // Vẽ các cột biểu đồ
    svg.selectAll(".bar")
        .data(aggregatedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d.day))
        .attr("y", (d) => yScale(d.avgRevenue))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => height - yScale(d.avgRevenue))
        .attr("fill", (d) => colorScale(d.day))
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").html(`
                <strong>Ngày ${d.day} </strong><br>
                <strong>Doanh số bán TB:</strong> ${(d.avgRevenue / 1e6).toFixed(1)} triệu VND
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

    // Thêm nhãn giá trị trên các cột
    svg.selectAll(".label")
        .data(aggregatedData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", (d) => xScale(d.day) + xScale.bandwidth() / 2)
        .attr("y", (d) => yScale(d.avgRevenue) - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .style("fill", "black")
        .text((d) => `${(d.avgRevenue / 1e6).toFixed(1)} tr`);

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng trung bình theo Ngày trong Tháng");
}
