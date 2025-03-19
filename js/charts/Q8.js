export function render(data) {
    // Parse date và thêm tháng
    const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");
    data.forEach(d => {
        d["Thời gian tạo đơn"] = parseDate(d["Thời gian tạo đơn"]);
        d["Tháng"] = d["Thời gian tạo đơn"].getMonth() + 1;
    });

    // Tạo mảng các tháng từ 1-12
    const months = Array.from({length: 12}, (_, i) => i + 1);
    
    // Tính số đơn unique theo từng nhóm hàng và tháng
    const groupOrders = months.map(month => {
        const monthData = data.filter(d => d["Tháng"] === month);
        const uniqueOrders = new Set(monthData.map(d => d["Mã đơn hàng"]));
        const totalOrders = uniqueOrders.size;
        
        // Tính cho từng nhóm hàng
        const groupCounts = d3.group(monthData, d => d["Mã nhóm hàng"]);
        const probabilities = Array.from(groupCounts.entries()).map(([groupCode, items]) => {
            const groupOrders = new Set(items.map(d => d["Mã đơn hàng"]));
            return {
                month: month,
                groupCode: groupCode,
                groupName: items[0]["Tên nhóm hàng"],
                probability: groupOrders.size / totalOrders
            };
        });
        
        return probabilities;
    }).flat();

    // Định dạng tên nhóm hàng
    groupOrders.forEach(d => {
        d.fullGroupName = `[${d.groupCode}] ${d.groupName}`;
    });

    // Chiều rộng và cao của biểu đồ
    const width = 950;
    const height = 500;
    const margin = { top: 50, right: 200, bottom: 100, left: 200 };

    // Tạo SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("font-family", "Arial, sans-serif")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang x
    const xScale = d3.scaleLinear()
        .domain([1, 12])
        .range([0, width]);

    // Thang y
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(groupOrders, d => d.probability)])
        .nice()
        .range([height, 0]);

    // Màu sắc - chỉ 5 màu cho 5 nhóm hàng
    const colors = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f"];
    const colorScale = d3.scaleOrdinal()
        .domain(Array.from(new Set(groupOrders.map(d => d.fullGroupName))))
        .range(colors);

    // Vẽ lưới dọc
    svg.selectAll("grid-line")
        .data(xScale.ticks())
        .join("line")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(xScale)
                .ticks(12)
                .tickFormat(d => `Tháng ${String(d).padStart(2, "0")}`)
        )
        .selectAll("text")
        .style("text-anchor", "middle");

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale)
            .tickFormat(d3.format(".0%"))
            .ticks(10));

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");

    // Tạo line generator
    const line = d3.line()
        .x(d => xScale(d.month))
        .y(d => yScale(d.probability));

    // Nhóm dữ liệu theo nhóm hàng
    const groupedData = d3.group(groupOrders, d => d.fullGroupName);

    // Vẽ đường và điểm cho từng nhóm
    groupedData.forEach((values, groupName) => {
        // Sắp xếp theo tháng
        values.sort((a, b) => a.month - b.month);
        
        // Vẽ đường
        svg.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", colorScale(groupName))
            .attr("stroke-width", 1.5)
            .attr("d", line);

        // Vẽ điểm
        svg.selectAll(`.circle-${groupName}`)
            .data(values)
            .join("circle")
            .attr("cx", d => xScale(d.month))
            .attr("cy", d => yScale(d.probability))
            .attr("r", 4)
            .attr("fill", colorScale(groupName))
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                    .html(`<strong>Tháng ${String(d.month).padStart(2, "0")}</strong><br>Nhóm hàng: ${d.fullGroupName}<br>Xác suất Bán: ${d3.format(".1%")(d.probability)}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });
    });

    // Thêm legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 30}, 0)`);

    Array.from(groupedData.keys()).forEach((groupName, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", colorScale(groupName));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .style("text-anchor", "start")
            .style("font-size", "11px")
            .text(groupName);
    });

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng của Nhóm hàng theo Tháng");
}