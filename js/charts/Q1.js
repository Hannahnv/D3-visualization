export function render(data) {
    // Xử lý data: tính tổng doanh số theo Mã mặt hàng
    const processedData = d3.rollup(
        data,
        v => d3.sum(v, d => +d["Thành tiền"]), // Tính tổng doanh số cho từng Mã mặt hàng
        d => d["Mã mặt hàng"] // Nhóm dữ liệu theo Mã mặt hàng
    );

    // Chuyển thành mảng và sắp xếp giảm dần theo tổng doanh số
    const aggregatedData = Array.from(processedData, ([code, total]) => ({
        code,
        name: data.find(d => d["Mã mặt hàng"] === code)["Tên mặt hàng"], // Lấy tên mặt hàng
        groupCode: data.find(d => d["Mã mặt hàng"] === code)["Mã nhóm hàng"], // Lấy Mã nhóm hàng
        total
    })).sort((a, b) => b.total - a.total);

    // Màu sắc theo `Mã nhóm hàng`
    const colorScale = d3.scaleOrdinal()
        .domain(Array.from(new Set(aggregatedData.map(d => d.groupCode))))
        .range(d3.schemeTableau10);

    // Tạo SVG và căn chỉnh
    const width = 900;
    const height = 500;
    const margin = { top: 50, right: 200, bottom: 50, left: 250 };

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right) // Tổng chiều rộng của SVG
        .attr("height", height + margin.top + margin.bottom) // Tổng chiều cao của SVG
        .style("font-family", "Arial, sans-serif") // Font chữ
        .append("g") // Thêm nhóm (group) để căn chỉnh nội dung
        .attr("transform", `translate(${margin.left}, ${margin.top})`); // Dịch chuyển nhóm theo margin

    // Vẽ thang đo
    const yScale = d3.scaleBand()
        .domain(aggregatedData.map(d => `[${d.code}] ${d.name}`))
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
        .style("font-family", "Arial, sans-serif"); // Font chữ của tooltip

    // Vẽ cột
    svg.selectAll("rect")
        .data(aggregatedData)
        .join("rect")
        .attr("x", margin.left)
        .attr("y", d => yScale(`[${d.code}] ${d.name}`))
        .attr("width", d => xScale(d.total) - margin.left)
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.groupCode)) // Màu theo Mã nhóm hàng
        .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>Mặt hàng:</strong> [${d.code}] ${d.name}<br>
                    <strong>Nhóm hàng:</strong> [${d.groupCode}] ${data.find(item => item["Mã nhóm hàng"] === d.groupCode)["Tên nhóm hàng"]}<br>
                    <strong>Doanh số:</strong> ${d3.format(",")(d.total)} VND
                `); // Hiển thị Mặt hàng, Nhóm hàng và Doanh số
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    // Thêm label giá trị trên các cột
    svg
        .selectAll(".label")
        .data(aggregatedData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => xScale(d.total) + 5) // Đặt label ngay bên phải cột
        .attr("y", d => yScale(`[${d.code}] ${d.name}`) + yScale.bandwidth() / 2) // Canh giữa chiều cao của cột
        .style("text-anchor", "start")
        .style("font-size", "10px")
        .style("fill", "black") // Màu chữ
        .text(d => {
            const value = d.total;
            if (value >= 1e9) {
                return `${Math.round(value / 1e9)} tỷ VND`; // Ví dụ: 1,200,000,000 => 1.2 tỷ VND
            } else if (value >= 1e6) {
                return `${Math.round(value / 1e6)} triệu VND`; // Ví dụ: 626,000,000 => 626 triệu VND
            } else {
                return `${Math.round(value / 1e3)} nghìn VND`; // Ví dụ: 25,000 => 25 nghìn VND
            }
        });

    // Thêm legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 50}, 0)`);

    const uniqueGroupCodes = Array.from(new Set(aggregatedData.map(d => d.groupCode)));
    uniqueGroupCodes.forEach((groupCode, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", colorScale(groupCode));
        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .style("text-anchor", "start")
            .style("font-size", "11px")
            .style("fill", "black") // Đảm bảo màu chữ là màu đen
            .text(() => {
                const group = data.find(d => d["Mã nhóm hàng"] === groupCode);
                return group ? `[${groupCode}] ${group["Tên nhóm hàng"]}` : `[${groupCode}] Unknown`;
            });
    });

    // Tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold") // In đậm tiêu đề
        .text("Doanh số bán hàng theo Mặt hàng");

    // Trục x (định dạng kiểu 50M, 100M)
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => `${d / 1e6}M`) // Hiển thị kiểu 50M, 100M
        );

    // Trục y
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));
}
