export function render(data) {
    // Thêm cột tháng từ ngày
    data.forEach(d => {
        d.Tháng = new Date(d["Thời gian tạo đơn"]).getMonth() + 1;
    });

    // Nhóm dữ liệu theo Mã nhóm hàng
    const groupedByProductGroup = d3.group(data, d => d["Mã nhóm hàng"]);

    // Sắp xếp lại các nhóm để đặt [TMX] Trà mix trước [TTC] Trà củ, quả sấy
    const orderedGroupCodes = ["TMX", "TTC"];
    const orderedGroups = Array.from(groupedByProductGroup)
        .sort(([a], [b]) => orderedGroupCodes.indexOf(a) - orderedGroupCodes.indexOf(b));

    // Xử lý dữ liệu cho từng nhóm
    const probabilitiesByGroup = orderedGroups.map(([groupCode, groupData]) => {
        const groupName = groupData[0]["Tên nhóm hàng"];
        
        // Lấy các mặt hàng duy nhất trong nhóm 
        const items = Array.from(new Set(groupData.map(d => d["Mã mặt hàng"])))
            .map(itemCode => {
                const itemData = groupData.find(d => d["Mã mặt hàng"] === itemCode);
                return {
                    itemCode,
                    itemName: itemData["Tên mặt hàng"]
                };
            });

        // Tính xác suất theo tháng cho từng mặt hàng
        const monthlyProbabilities = Array.from(d3.group(groupData, d => d.Tháng), ([month, monthData]) => {
            const totalMonthOrders = new Set(monthData.map(d => d["Mã đơn hàng"])).size;
            
            const itemProbabilities = items.map(item => {
                const itemMonthData = monthData.filter(d => d["Mã mặt hàng"] === item.itemCode);
                const itemOrders = new Set(itemMonthData.map(d => d["Mã đơn hàng"])).size;
                return {
                    month,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    probability: itemOrders / totalMonthOrders
                };
            });

            return itemProbabilities;
        }).flat();

        return {
            groupCode,
            groupName,
            items,
            monthlyProbabilities
        };
    });

    // Tạo một tập hợp màu duy nhất cho tất cả các mặt hàng trong tất cả các nhóm
    const allItems = Array.from(new Set(data.map(d => d["Mã mặt hàng"])));
    const colorScale = d3.scaleOrdinal()
        .domain(allItems)
        .range(d3.quantize(d3.interpolateRainbow, allItems.length));

    // Cấu hình trực quan hóa
    const subplotWidth = 300; // Chiều rộng điều chỉnh
    const subplotHeight = 150; // Chiều cao điều chỉnh
    const margin = { top: 100, right: 60, bottom: 100, left: 70 }; // Lề điều chỉnh
    const padding = 40; // Đệm điều chỉnh

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

    // Tạo từng subplot
    probabilitiesByGroup.forEach((group, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = col * (subplotWidth + margin.left + margin.right + padding);
        const y = row * (subplotHeight + margin.top + margin.bottom + padding);

        const subplot = svg.append("g")
            .attr("transform", `translate(${x + margin.left}, ${y + margin.top})`);

        // Lấy các tháng duy nhất cho nhóm này
        const months = Array.from(new Set(group.monthlyProbabilities.map(d => d.month))).sort();

        // Thang đo
        const xScale = d3.scaleLinear()
            .domain([d3.min(months), d3.max(months)])
            .range([0, subplotWidth]);

        let yScale;
        if (group.groupCode === "BOT") {
            yScale = d3.scaleLinear()
                .domain([0.9, 1.1])
                .range([subplotHeight, 0]);
        } else {
            const minProbability = d3.min(group.monthlyProbabilities, d => d.probability);
            const maxProbability = d3.max(group.monthlyProbabilities, d => d.probability);
            yScale = d3.scaleLinear()
                .domain([Math.floor(minProbability * 20) / 20, Math.ceil(maxProbability * 20) / 20])
                .range([subplotHeight, 0]);
        }

        // Vẽ trục với các đường lưới dọc
        subplot.append("g")
            .attr("transform", `translate(0, ${subplotHeight})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => `T${d.toString().padStart(2, '0')}`)
                .ticks(months.length)
                ) // Thêm các đường lưới dọc .tickSize(-subplotHeight)
            .selectAll("line")
            .attr("stroke", "#ccc");

        subplot.append("g")
            .call(d3.axisLeft(yScale)
                .tickFormat(d3.format(".0%"))
                .ticks(group.groupCode === "BOT" ? 2 : 6) // Điều chỉnh số lượng ticks cho nhóm BOT
                .tickValues(group.groupCode === "BOT" ? [0.9, 1.0, 1.1] : undefined)); // Đặt các giá trị tick cụ thể cho nhóm BOT

        // Tạo bộ tạo đường
        const line = d3.line()
            .x(d => xScale(d.month))
            .y(d => yScale(d.probability));

        // Vẽ các đường cho từng mặt hàng
        group.items.forEach(item => {
            const itemData = group.monthlyProbabilities
                .filter(d => d.itemCode === item.itemCode)
                .sort((a, b) => a.month - b.month);

            // Vẽ đường
            subplot.append("path")
                .datum(itemData)
                .attr("fill", "none")
                .attr("stroke", colorScale(item.itemCode))
                .attr("stroke-width", 1.5)
                .attr("d", line);

            // Thêm các điểm
            subplot.selectAll(`.point-${item.itemCode}`)
                .data(itemData)
                .enter()
                .append("circle")
                .attr("class", `point-${item.itemCode}`)
                .attr("cx", d => xScale(d.month))
                .attr("cy", d => yScale(d.probability))
                .attr("r", 4)
                .attr("fill", colorScale(item.itemCode))
                .on("mouseover", function(event, d) {
                    tooltip.style("visibility", "visible")
                        .html(`<strong>T${d.month.toString().padStart(2, '0')} | Mặt hàng [${d.itemCode}] ${d.itemName}</strong><br>
                        Nhóm hàng: [${group.groupCode}] ${group.groupName} | Xác suất Bán / Nhóm hàng: ${(d.probability * 100).toFixed(1)}%`);
                })
                .on("mousemove", function(event) {
                    tooltip.style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("visibility", "hidden");
                });
        });

        // Thêm tiêu đề subplot
        subplot.append("text")
            .attr("x", subplotWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("font-weight", "bold")
            .text(`[${group.groupCode}] ${group.groupName}`);

        // Thêm chú giải
        const legend = subplot.append("g")
            .attr("transform", `translate(0, ${subplotHeight + 50})`);

        group.items.forEach((item, i) => {
            const legendItem = legend.append("g")
                .attr("transform", `translate(${(i % 2) * 200}, ${Math.floor(i / 2) * 20})`);

            legendItem.append("rect")
                .attr("x", 10)
                .attr("y", -5)
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", colorScale(item.itemCode));

            legendItem.append("text")
                .attr("x", 25)
                .attr("y", 4)
                .style("font-size", "10px")
                .text(`[${item.itemCode}] ${item.itemName}`);
        });
    });

    // Thêm tiêu đề chính
    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng của mặt hàng theo nhóm hàng trong từng tháng");

    // Thêm container tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");
}