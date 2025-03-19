export function render(data) {
    // Xử lý dữ liệu
    const groupedData = d3.group(data, d => d["Mã nhóm hàng"], d => d["Tên nhóm hàng"]);
    const totalOrdersByGroup = Array.from(groupedData, ([groupCode, groupNameMap]) => {
        const groupName = Array.from(groupNameMap.keys())[0];
        const uniqueOrders = new Set(Array.from(groupNameMap.values()).flat().map(d => d["Mã đơn hàng"])).size;
        return { groupCode, groupName, uniqueOrders };
    });

    const grandTotalOrders = new Set(data.map(d => d["Mã đơn hàng"])).size; // Tổng số đơn hàng duy nhất

    // Tính xác suất
    const probabilities = totalOrdersByGroup.map(d => ({
        groupCode: d.groupCode,
        groupName: d.groupName,
        probability: d.uniqueOrders / grandTotalOrders
    })).sort((a, b) => b.probability - a.probability); // Sắp xếp giảm dần theo xác suất

    // Cấu hình kích thước biểu đồ
    const width = 900;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 50, left: 300 };

    // Tạo SVG container
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("font-family", "Arial, sans-serif")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo trục y (Tên nhóm hàng)
    const yScale = d3.scaleBand()
        .domain(probabilities.map((d) => `[${d.groupCode}] ${d.groupName}`)) // Ký hiệu: [Mã nhóm hàng] Tên nhóm hàng
        .range([0, height])
        .padding(0.2);

    // Thang đo trục x (Xác suất)
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(probabilities, (d) => d.probability)])
        .nice()
        .range([0, width]);

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale).tickSize(0))
        .selectAll("text")
        .style("font-size", "12px")
        .style("text-anchor", "end");

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(xScale)
                .tickFormat(d3.format(".0%")) // Định dạng theo phần trăm
        )
        .style("font-size", "12px");

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");

    // Vẽ các thanh biểu đồ
    svg.selectAll(".bar")
        .data(probabilities)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", (d) => yScale(`[${d.groupCode}] ${d.groupName}`))
        .attr("x", 0)
        .attr("width", (d) => xScale(d.probability))
        .attr("height", yScale.bandwidth())
        .attr("fill", (d, i) => d3.schemeTableau10[i % 10])
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").html(`
                <strong>Nhóm hàng:</strong> [${d.groupCode}] ${d.groupName}<br>
                <strong>Xác suất Bán:</strong> ${d3.format(".1%")(d.probability)}
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

    // Thêm nhãn giá trị trên thanh
    svg.selectAll(".label")
        .data(probabilities)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", (d) => xScale(d.probability) + 5)
        .attr("y", (d) => yScale(`[${d.groupCode}] ${d.groupName}`) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "black")
        .text((d) => d3.format(".1%")(d.probability)); // Hiển thị xác suất dạng phần trăm

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng theo Nhóm hàng");

    // Thêm nhãn trục x
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px");
}
