// Original JavaScript code by Chirp Internet: www.chirp.com.au
// Please acknowledge use of this code by including this header.

var rta_modal_init = function() {
	var openModal = function()
	{
	  var modalWrapper = document.getElementById("rta_modal_wrapper");
	  var modalWindow  = document.getElementById("rta_modal_window");
	  modalWrapper.className = "overlay";
	  var overflow = modalWindow.offsetHeight - document.documentElement.clientHeight;
	  if(overflow > 0) {
		modalWindow.style.maxHeight = (parseInt(window.getComputedStyle(modalWindow).height) - overflow) + "px";
	  }
	  modalWindow.style.marginTop = (-modalWindow.offsetHeight)/2 + "px";
	  modalWindow.style.marginLeft = (-modalWindow.offsetWidth)/2 + "px";
	};

	var closeModal = function()
	{
	  var modalWrapper = document.getElementById("rta_modal_wrapper");
	  if(modalWrapper) {
		modalWrapper.className = "";
	  }
	};

	var clickHandler = function(e) {
	  if(!e.target) e.target = e.srcElement;
	  if(e.target.tagName == "DIV") {
		if(e.target.id != "rta_modal_window") closeModal(e);
	  }
	};

	var keyHandler = function(e) {
	  if(e.keyCode == 27) closeModal(e);
	};

	if(document.addEventListener) {
	  document.addEventListener("click", clickHandler, false);
	  document.addEventListener("keydown", keyHandler, false);
	} else {
	  document.attachEvent("onclick", clickHandler);
	  document.attachEvent("onkeydown", keyHandler);
	}

	return [openModal, closeModal];
};
