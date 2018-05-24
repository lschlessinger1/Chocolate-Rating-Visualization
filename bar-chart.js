var dataFolder = "";
var cacaoFileName = "flavors_of_cacao.csv";

// Columns:
    // Company: 
        // Name of the company manufacturing the bar.
    // Specific_Bean_Origin_Or_Bar_Name: 
        // The specific geo-region of origin for the bar.
    // REF: 
        // A value linked to when the review was entered in the database. Higher = more recent.
    // Review_Date: 
        // Date of publication of the review.
    // Cocoa_Percent: 
        // Cocoa percentage (darkness) of the chocolate bar being reviewed.
    // Company_Location: 
        // Manufacturer base country.
    // Rating: 
        // Expert rating for the bar.
    // Bean_Type: 
        // The variety (breed) of bean used, if provided.
    // Broad_Bean_Origin: 
        // The broad geo-region of origin for the bean.

// define svg variables
var margin, width, height;

var breakpoint = 768; // min width

var barPad = 1;
var maxRating = 5;
var n, barWidth;

updateDimensions(document.getElementById("main-content").clientWidth);

// define scales
var barXScale = d3.scaleLinear()
    .range([0, width]);
var barYScale = d3.scaleLinear()
    .range([height, 0])
    .domain([0, 5]);

var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return "<p><span class='font-weight-bold'>" + d.company + "</span> (" + d.companyLoc + ") <br> Mean Rating: <span class='text-primary font-weight-bold'>" 
    + d.meanRating.toFixed(2)+"</span></p>";
  })

// define canvas SVG
var canvas = d3.select("body #canvas")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform",  "translate(" + margin.left + "," + margin.top + ")");

canvas.call(tip);

var secondarySortProp = "meanRating"; // for now choose from {cocoaPercent, meanRating}
var colorGrouping = "companyLoc"; // for now 

createBarChart();

// helper functions
function updateDimensions(winWidth) {
    margin = { 
        top: 20,
        right: 50,
        bottom: 70, 
        left: 50
    };

    margin.right = winWidth < breakpoint ? 0 : margin.right;
    margin.left  = winWidth < breakpoint ? 0 : margin.left;
    
    width  = winWidth > breakpoint ? winWidth - margin.left - margin.right : 768;
    height = .6 * width; //aspect ratio is 0.6
    // height = 500 - margin.top - margin.bottom;
}

function createBarChart() {
    canvas.html("");
    d3.csv(dataFolder + cacaoFileName, init); // load data, then initialize chart
}

function init(dataset) {
    // first augment dataset by chunking into {company: mean rating} objects
    var uniqueCompanies = createUniqueCompanies(dataset);
    
    // add company to object and convert to array
    var companyData = createCompanyDataArr(uniqueCompanies);

    n = companyData.length;
    barWidth = width / n;

    // sort by company, then something else (in this case mean rating)
    companyData = sortCompanyData(companyData, secondarySortProp);

    // coloring scheme
    // color by company location

    // count unique company locations
    
    var uniqueGroupDict = {};
    var i = 0;
    companyData.forEach((element) => {
        var group = element[colorGrouping];
        if (uniqueGroupDict.hasOwnProperty(group)) {
            uniqueGroupDict[group] = {
                sum: uniqueGroupDict[group].sum + 1, 
                endIdx: i
            };
        } else {
            uniqueGroupDict[group] = {
                sum: 1, 
                endIdx: i
            };
        }
        i++;
    });

    var uniqueGroups =  Object.keys(uniqueGroupDict)
    var numUniqueGroups = uniqueGroups.length;

    var colorScales = generateColorScales(numUniqueGroups);

    // create map from company location name to [0...numUniqueCompanyLocs]
    var groupDict = {};
    var availableIndices = d3.range(colorScales.length);
    for (var i = 0; i < numUniqueGroups; i++) {
        var idx = availableIndices[i % availableIndices.length];
        groupDict[uniqueGroups[i]] = {
            index: i, 
            scaleIdx: idx
        };
    }

    // addBars
    addBars(companyData, groupDict, colorScales, colorGrouping);

    addCountryLabels(companyData, uniqueGroupDict, numUniqueGroups);

    //  Create Axes
    var xAxis = d3.axisBottom(barXScale)
      .ticks(0);
    var yAxis = d3.axisLeft(barYScale)
      .ticks(5);
    
    var xPadding = 0;
    canvas.append("g")
        .attr("id", "x-axis")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (height) + ")")
        .call(xAxis);
    canvas.append("text")
        .attr("class", "axis-text")             
        .attr("x", width/2)
        .attr("y", height)
        .attr("dy", "2em")
        .attr("text-anchor", "middle")
        .text("Artisanal Chocolate Companies");

    canvas.append("g")
        .attr("id", "y-axis")
        .attr("class", "axis")
        .attr("transform", "translate(" + -2 + ",0)")
        .call(yAxis);
    canvas.append("text")
        .attr("class", "axis-text")             
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "-2em")
        .text("Mean Rating");
}

function createUniqueCompanies(dataset) {
    var uniqueCompanies = {};

    dataset.forEach(function(element) {
        var company = element.Company;
        var rating = parseFloat(element.Rating);
        var companyLocation = element.Company_Location;
        var pctCocoa = element.Cocoa_Percent;
        var broadBeanOrigin = element.Broad_Bean_Origin;
        var beanType = element.Bean_Type
        var barName = element.Specific_Bean_Origin_Or_Bar_Name;
        var reviewDate = element.Review_Date;
        var beanType = element.Bean_Type;
        // Company  Specific_Bean_Origin_Or_Bar_Name    REF Review_Date Cocoa_Percent   Company_Location    Rating  Bean_Type   Broad_Bean_Origin

        if (uniqueCompanies.hasOwnProperty(company)) {
            var prevNumBars = uniqueCompanies[company].numBars;
            var prevTotalRating = uniqueCompanies[company].totalRating;
            var newNumBars = prevNumBars + 1;
            var newTotalRating = prevTotalRating + rating;
            uniqueCompanies[company].numBars = newNumBars;
            uniqueCompanies[company].totalRating = newTotalRating;
            uniqueCompanies[company].meanRating = newTotalRating / newNumBars;
        } else {
            uniqueCompanies[company] = { 
                numBars: 1,
                totalRating: rating,
                meanRating: rating,
                companyLoc: companyLocation,
            };
        }
    });

    return uniqueCompanies;
}

function createCompanyDataArr(uniqueCompanies) {
    var companyData = [];

    Object.entries(uniqueCompanies).forEach(([key, value]) => {
        value.company = key;
        companyData.push(value);
    });

    return companyData;
}

function sortCompanyData(companyData, secondarySortProp) {

    return companyData.sort(function(c1, c2) { 
        var locA = c1.companyLoc;
        var locB = c2.companyLoc;
        if (locA.localeCompare(locB) == 1) {
            return 1;
        }  else if (locA.localeCompare(locB) == -1) {
            return -1;
        } else {
            var propA = c1[secondarySortProp];
            var propB = c2[secondarySortProp];
            if (propA > propB) {
                return -1;
            } else if (propA < propB) {
                return 1;
            } else {
                return 0;
            }
        }
    });
}

// inspired by: https://stackoverflow.com/questions/20847161/how-can-i-generate-as-many-colors-as-i-want-using-d3
function generateColorScales(numUniqueGroups) {
    var colorDomain = [0, numUniqueGroups - 1];
    var colorInterpoolator = d3.interpolateHcl;

    var colorScales = [ 
        d3.scaleLinear()
            .domain(colorDomain)
            .interpolate(colorInterpoolator) 
            .range(["#a6cee3", "#fdbf6f"]),
        d3.scaleLinear()
            .domain(colorDomain)
            .interpolate(colorInterpoolator) 
            .range(["#1f78b4","#ff7f00"]),
        d3.scaleLinear()
            .domain(colorDomain)
            .interpolate(colorInterpoolator) 
            .range(["#b2df8a","#cab2d6"]),
        d3.scaleLinear()
            .domain(colorDomain)
            .interpolate(colorInterpoolator) 
            .range(["#33a02c","#6a3d9a"]),
        d3.scaleLinear()
            .domain(colorDomain)
            .interpolate(colorInterpoolator) 
            .range(["#fb9a99","#ffff99"]),
        d3.scaleLinear()
            .domain(colorDomain)
            .interpolate(colorInterpoolator) 
            .range(["#e31a1c","#b15928"])
    ];

    return colorScales
}

function addBars(companyData, groupDict, colorScales, colorGrouping) {
    // set domain of axes
    barXScale.domain([0, n]);
    canvas.selectAll("rect")
        .data(companyData)
        .enter()
        .append("rect")
        .attr("class", "bar")  
        .attr("id", function (d, i) {
            return "bar-id-" + d.company.split(" ").join("-");
        })
        .attr("x", function(d, i) {
            return barXScale(i);
        })
        .attr("y", function(d) {
            return height - barYScale(maxRating - d.meanRating);
        })
        .attr("width", barWidth - barPad)
        .attr("height", function(d) {
            return barYScale(maxRating - d.meanRating);
        })
        .attr("fill", function(d, i) {
            var companyDict = groupDict[d[colorGrouping]];
            var colorVal = companyDict.index;
            var colorScale = colorScales[companyDict.scaleIdx];
            return colorScale(colorVal);
        })
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide);
}

function addCountryLabels(companyData, uniqueGroupDict, numUniqueGroups) {
    // add country labels
    var countryXScale = d3.scaleLinear()
        .domain([0, numUniqueGroups])
        .range([0, width]);

    var startIdx = 0;

    Object.entries(uniqueGroupDict).forEach(([location, val]) => {
        var numOccurences = val.sum;
        var endIdx = val.endIdx;
        var middleIdx = (startIdx + endIdx) / 2;
        var minCountryRating = 5;
        for (var i = startIdx; i < endIdx; i++) {
            minCountryRating = Math.min(minCountryRating, companyData[i].meanRating);
        }

        if (numOccurences > 40) {
            // add horizontal label

            // need to map country index to 0...n
            canvas.append("text")
                .attr("x", barXScale(middleIdx))
                .attr("y", height - barYScale(5 - minCountryRating/2))
                .style("stroke", "black")
                .attr("shape-rendering", "crispEdges")
                .attr("font-family", "sans-serif")
                .attr("font-size", "3em")
                .style("opacity", "0.9")
                .attr("alignment-baseline", "middle")
                .attr("text-anchor", "middle")
                .text(location);
        } else if (numOccurences > 5) {
            // add vertical label
            canvas.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -(height - barYScale(5 - minCountryRating/2)))
                .attr("y", barXScale(middleIdx))
                .style("stroke", "black")
                .style("opacity", "0.9")
                .attr("shape-rendering", "crispEdges")
                .attr("font-family", "sans-serif")
                .attr("font-size", "0.75em")
                .attr("alignment-baseline", "middle")
                .attr("text-anchor", "middle")
                .text(location);
        }

        startIdx = endIdx + 1;
    });
}