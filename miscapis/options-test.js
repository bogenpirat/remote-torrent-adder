// Simple test file to check if JavaScript files can be loaded
console.log('options-test.js loaded successfully');

document.addEventListener('DOMContentLoaded', function() {
    console.log('options-test.js: DOM loaded');
    
    // Test if we can find the notification test button
    const testButton = document.querySelector("#notificationtest");
    console.log('Test button found:', testButton);
    
    if (testButton) {
        testButton.onclick = function() {
            console.log('Test button clicked from options-test.js');
            alert('Test button works! JavaScript is loading.');
        };
    }
});
