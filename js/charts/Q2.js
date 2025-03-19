export function render(data) {
    // Xử lý data: Tính tổng doanh số theo Mã nhóm hàng
    const processedData = d3.rollup(
        data,
        v => d3.sum(v, d => +d["Thành tiền"]),
        d => d["Mã nhóm hàng"]
    );

    // Chuyển thành mảng và sắp xếp giảm dần theo tổng doanh số
    const aggregatedData = Array.from(processedData, ([groupCode, total]) => ({
        groupCode,
        groupName: data.find(d => d["Mã nhóm hàng"] === groupCode)["Tên nhóm hàng"], // Lấy tên nhóm hàng
        total
    })).sort((a, b) => b.total - a.total);

    // Màu sắc ngẫu nhiên cho từng nhóm hàng
    const colorScale = d3.scaleOrdinal()
        .domain(aggregatedData.map(d => d.groupCode))
        .range(d3.schemeTableau10);

    // Cài đặt SVG
    const width = 900;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 50, left: 200 };

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right) // Tổng chiều rộng của SVG
        .attr("height", height + margin.top + margin.bottom) // Tổng chiều cao của SVG
        .style("font-family", "Arial, sans-serif") // Font chữ
        .append("g") // Thêm nhóm (group) để căn chỉnh nội dung
        .attr("transform", `translate(${margin.left}, ${margin.top})`); // Dịch chuyển nhóm theo margin

    // Thang đo
    const yScale = d3.scaleBand()
        .domain(aggregatedData.map(d => `[${d.groupCode}] ${d.groupName}`))
        .range([margin.top, height - margin.bottom])
        .padding(0.2);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, d => d.total)])
        .range([margin.left, width - margin.right])
        .nice();

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ddd")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif");

    // Vẽ cột
    svg.selectAll("rect")
        .data(aggregatedData)
        .join("rect")
        .attr("x", margin.left)
        .attr("y", d => yScale(`[${d.groupCode}] ${d.groupName}`))
        .attr("width", d => xScale(d.total) - margin.left)
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.groupCode))
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>Nhóm hàng:</strong> [${d.groupCode}] ${d.groupName}<br>
                    <strong>Doanh số:</strong> ${d3.format(",")(d.total)} VND`); // Hiển thị doanh số dạng số
        })
        .on("mousemove", event => {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));
    
    // Thêm label giá trị trên cột
    svg.selectAll(".label")
    .data(aggregatedData)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => xScale(d.total) + 5)
    .attr("y", d => yScale(`[${d.groupCode}] ${d.groupName}`) + yScale.bandwidth()/2)
    .style("text-anchor", "start")
    .style("font-size", "13px")
    .style("fill", "black")
    .text(d =>{
        const value = d.total;
        if (value >= 1e9) {
            return `${(value / 1e9).toFixed(1)} tỷ VND`; // Ví dụ: 1,200,000,000 => 1.2 tỷ VND
        } else if (value >= 1e6) {
            return `${Math.round(value / 1e6)} triệu VND`; // Ví dụ: 626,000,000 => 626 triệu VND
        } else {
            return `${Math.round(value / 1e3)} nghìn VND`; // Ví dụ: 25,000 => 25 nghìn VND
        }
    })

    // Tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng theo Nhóm hàng");

    // Trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d => `${d / 1e6}M`));

    // Trục y
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));
}
