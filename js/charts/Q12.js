export function render(data) {
    // Tính tổng chi tiêu của mỗi khách hàng
    const customerSpending = Array.from(d3.rollup(
        data,
        v => d3.sum(v, d => +d["Thành tiền"]),
        d => d["Mã khách hàng"]
    ).values());

    // Kích thước biểu đồ
    const width = 900;
    const height = 500;
    const margin = { top: 70, right: 50, bottom: 50, left: 270 };

    // Tạo SVG container
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .style("font-family", "Arial, sans-serif")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tính toán bins với khoảng cố định
    const maxSpending = d3.max(customerSpending);
    const binWidth = 50000; // Khoảng 50,000 cho mỗi bin
    const binCount = Math.ceil(maxSpending / binWidth);
    const bins = d3.bin()
        .domain([0, maxSpending])
        .thresholds(d3.range(0, maxSpending, binWidth))(customerSpending);

    // Thang x
    const xScale = d3.scaleLinear()
        .domain([0, maxSpending])
        .range([0, width]);

    // Thang y với giới hạn max là 2000
    const yScale = d3.scaleLinear()
        .domain([0, Math.min(2000, d3.max(bins, d => d.length))])
        .nice()
        .range([height, 0]);

    // Vẽ lưới ngang
    svg.selectAll("grid-line")
        .data(yScale.ticks())
        .join("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");

    // Vẽ histogram bars
    svg.selectAll("rect")
        .data(bins)
        .join("rect")
        .attr("x", d => xScale(d.x0) + 1)
        .attr("y", d => yScale(d.length))
        .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
        .attr("height", d => height - yScale(d.length))
        .attr("fill", "#4e79a7")
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
                .html(`<strong>Đã chi tiêu Từ ${d3.format(",")(d.x0)} đến ${d3.format(",")(d.x1)}</strong><br>Số lượng KH: ${d3.format(",")(d.length)}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    // Format trục x (K = nghìn)
    const formatK = val => {
        return `${(val/1000).toFixed(0)}K`;
    };

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale)
            .tickFormat(d3.format(","))) // Điều chỉnh định dạng để hiện 1,000; 2,000; 3,000
        .append("text")
        .attr("fill", "#000")
        .attr("x", -margin.left) // Điều chỉnh khoảng cách theo chiều ngang
        .attr("y", -70)          // Điều chỉnh khoảng cách theo chiều dọc
        .attr("text-anchor", "start")
        .attr("transform", `rotate(-90)`) // Sử dụng attr để xoay chữ
        .style("font-size", "12px")
        .text("Số Khách hàng");

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Phân phối mức chi trả của khách hàng");

    // Thêm nhãn khoảng giá trị dưới mỗi cột
    svg.selectAll(".range-label")
        .data(bins)
        .join("text")
        .attr("class", "range-label")
        .attr("x", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .attr("y", height + 25)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .attr("transform", d => `rotate(-90, ${xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2}, ${height + 25})`)
        .text(d => formatK(d.x0));

    // Ẩn đường viền
    svg.selectAll(".domain").remove();
    svg.selectAll(".tick line").remove();
}