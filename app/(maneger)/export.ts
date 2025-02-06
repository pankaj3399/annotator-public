export function extractElementDetails(content) {
    const elements = [];

    // Recursively iterate through the content to extract elements
    function extractContent(node) {
        if (node.content && Array.isArray(node.content)) {
            node.content.forEach(extractContent); // If content is an array, recurse
        } else if (node.name && node.content) {
            let extractedContent;

            // Extract the specific content based on the element's name
            switch (node.type) {
                case 'inputText':
                case 'text':
                case 'dynamicText':
                    extractedContent = node.content.innerText || '';
                    break;
                case 'dynamicVideo':
                case 'dynamicImage':
                case 'dynamicAudio':
                case 'recordAudio':
                case 'recordVideo':
                case 'inputRecordAudio':
                case 'inputRecordVideo':
                    extractedContent = node.content.src || '';
                    break;
                case 'checkbox':
                    extractedContent = {
                        checkboxTitle: node.content.title || '',
                        selectedCheckbox: node.content.selectedCheckbox || [],
                    };
                    break;
                default:
                    extractedContent = 'Unknown content';
            }

            // If the extracted content is an object, flatten it
            if (typeof extractedContent === 'object' && !Array.isArray(extractedContent)) {
                Object.keys(extractedContent).forEach((key) => {
                    elements.push({ name: `${node.name}_${key}`, content: extractedContent[key] });
                });
            } else {
                elements.push({ name: node.name, content: extractedContent });
            }
        }
    }

    // Start extracting content from the given JSON structure
    extractContent(content[0]);

    return elements;
}

export function parseAndAddSelectedItemsToArray(dataArray, selectedItems) {
    // Iterate over the array and apply the parsing and updating function to each object
    return dataArray.map(obj => {
        // Parse the content from the object (assuming it's a stringified JSON)
        const contentArray = JSON.parse(obj.content);

        // Use the previous function to extract the elements
        const extractedElements = extractElementDetails(contentArray);

        // Filter out only the elements that match the selectedItems
        const filteredElements = extractedElements.filter(element =>
            selectedItems.includes(element.name)
        );

        // Add the selected elements to the original object
        filteredElements.forEach(element => {
            obj[element.name] = element.content;
        });

        const { content, __v, submitted, feedback, status, _id, ...rest } = obj;
        rest.taskId = _id;

        return rest; // Return the updated object
    });
}

