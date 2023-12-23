const currentTime = new Date().getHours();
if (currentTime >= 18 || currentTime < 6) {
    document.body.style.backgroundColor = "black";
    document.body.style.color = "white";
}