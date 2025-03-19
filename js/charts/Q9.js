export function render(data) {
    // Nhóm dữ liệu theo nhóm sản phẩm trước
    const groupedByProductGroup = d3.group(data, d => d["Mã nhóm hàng"]);
    
    // Tính xác suất cho từng mặt hàng trong nhóm sản phẩm của nó
    const probabilitiesByGroup = Array.from(groupedByProductGroup, ([groupCode, groupData]) => {
        const groupName = groupData[0]["Tên nhóm hàng"];
        const totalGroupOrders = new Set(groupData.map(d => d["Mã đơn hàng"])).size;
        
        // Nhóm theo mặt hàng trong nhóm sản phẩm này
        const itemGroups = d3.group(groupData, d => d["Mã mặt hàng"]);
        
        const items = Array.from(itemGroups, ([itemCode, itemData]) => {
            const itemName = itemData[0]["Tên mặt hàng"];
            const itemOrders = new Set(itemData.map(d => d["Mã đơn hàng"])).size;
            
            return {
                groupCode,
                groupName,
                itemCode,
                itemName,
                probability: itemOrders / totalGroupOrders
            };
        }).sort((a, b) => b.probability - a.probability);

        return {
            groupCode,
            groupName,
            items
        };
    });

    // Cấu hình subplot
    const subplotWidth = 250; // Chiều rộng điều chỉnh
    const subplotHeight = 150; // Chiều cao điều chỉnh
    const margin = { top: 90, right: 50, bottom: 40, left: 160 }; // Lề điều chỉnh
    const padding = 20; // Đệm điều chỉnh

    // Tính toán bố cục lưới (2 hàng x 3 cột)
    const rows = 2;
    const cols = 3;
    const totalWidth = cols * (subplotWidth + margin.left + margin.right) + (cols - 1) * padding;
    const totalHeight = rows * (subplotHeight + margin.top + margin.bottom) + (rows - 1) * padding;

    // Tạo container SVG chính
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight)
        .style("font-family", "Arial, sans-serif");

    // Tạo tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");

    // Tạo một tập hợp mã mặt hàng duy nhất để đảm bảo màu sắc duy nhất
    const allItems = Array.from(new Set(data.map(d => d["Mã mặt hàng"])));
    const colorScale = d3.scaleOrdinal()
        .domain(allItems)
        .range(d3.quantize(d3.interpolateRainbow, allItems.length));

    // Tạo từng subplot
    probabilitiesByGroup.forEach((group, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = col * (subplotWidth + margin.left + margin.right + padding);
        const y = row * (subplotHeight + margin.top + margin.bottom + padding);

        const subplot = svg.append("g")
            .attr("transform", `translate(${x + margin.left}, ${y + margin.top})`);

        // Thang đo cho subplot này
        const yScale = d3.scaleBand()
            .domain(group.items.map(d => `[${d.itemCode}] ${d.itemName}`))
            .range([0, subplotHeight])
            .padding(0.2);

        const maxProbability = d3.max(group.items, d => d.probability);
        const xScale = d3.scaleLinear()
            .domain([0, Math.ceil(maxProbability * 10) / 10]) // Làm tròn lên đến 10% gần nhất
            .nice()
            .range([0, subplotWidth]);

        // Xác định khoảng tick dựa trên groupCode
        let tickInterval;
        if (group.groupCode === "BOT" || group.groupCode === "TTC") {
            tickInterval = 0.2; // 20%
        } else if (group.groupCode === "TMX") {
            tickInterval = 0.1; // 10%
        } else {
            tickInterval = 0.05; // 5%
        }

        // Vẽ trục y
        subplot.append("g")
            .call(d3.axisLeft(yScale).tickSize(0))
            .selectAll("text")
            .style("font-size", "10px")
            .style("text-anchor", "end");

        // Vẽ trục x
        subplot.append("g")
            .attr("transform", `translate(0, ${subplotHeight})`)
            .call(
                d3.axisBottom(xScale)
                    .ticks(Math.ceil(maxProbability / tickInterval))
                    .tickFormat(d3.format(".0%"))
            )
            .style("font-size", "10px");

        // Vẽ các thanh
        subplot.selectAll(".bar")
            .data(group.items)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(`[${d.itemCode}] ${d.itemName}`))
            .attr("x", 0)
            .attr("width", d => xScale(d.probability))
            .attr("height", yScale.bandwidth())
            .attr("fill", d => colorScale(d.itemCode)) // Sử dụng thang màu duy nhất
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible").html(`
                    <strong>Mặt hàng:</strong> [${d.itemCode}] ${d.itemName}<br>
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

        // Thêm nhãn giá trị
        subplot.selectAll(".label")
            .data(group.items)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", d => xScale(d.probability) + 5)
            .attr("y", d => yScale(`[${d.itemCode}] ${d.itemName}`) + yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .style("font-size", "10px")
            .style("fill", "black")
            .text(d => d3.format(".1%")(d.probability));

        // Thêm tiêu đề subplot
        subplot.append("text")
            .attr("x", subplotWidth / 2)
            .attr("y", -margin.top / 5)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text(`[${group.groupCode}] ${group.groupName}`);
    });

    // Thêm tiêu đề chính
    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "17px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng của từng mặt hàng theo Nhóm hàng");
}