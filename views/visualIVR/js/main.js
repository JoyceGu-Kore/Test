var configURL = "https://demo.kore.net/visualIVR/send";
var BotUserID = (window.location.href).split("uId=")[1];
console.log(BotUserID);

function PostToRoute(){
    $.ajax({
        type: 'POST',
        url: configURL,
        contentType: 'application/json',
        data: JSON.stringify({
            "uID": BotUserID
        }), // access in body
        success: function(response) {
            console.log("Next Call :" + JSON.stringify(response));
        },error:function(err){
            console.log("Submit call error ",err);
        }
    });
}

$(function() {
    $("#wizard").steps({
        headerTag: "h4",
        bodyTag: "section",
        transitionEffect: "fade",
        enableAllSteps: true,
        transitionEffectSpeed: 300,
        labels: {
            next: "Next",
            previous: "Back",
            finish: 'Submit'
        },
        onStepChanging: function(event, currentIndex, newIndex) {
            if (newIndex >= 1) {
                $('.steps ul li:first-child a img').attr('src', 'images/step-1.png');
            } else {
                $('.steps ul li:first-child a img').attr('src', 'images/step-1-active.png');
            }

            if (newIndex === 1) {
                $('.steps ul li:nth-child(2) a img').attr('src', 'images/step-2-active.png');
                PostToRoute();

            } else {
                $('.steps ul li:nth-child(2) a img').attr('src', 'images/step-2.png');
            }

            if (newIndex === 2) {
                $('.steps ul li:nth-child(3) a img').attr('src', 'images/step-3-active.png');
                PostToRoute();
            } else {
                $('.steps ul li:nth-child(3) a img').attr('src', 'images/step-3.png');
            }

            if (newIndex === 3) {
                $('.steps ul li:nth-child(4) a img').attr('src', 'images/step-4-active.png');
                PostToRoute();
                $('.actions ul').addClass('step-4');
            }
            if (newIndex === 4) {
                $('.steps ul li:nth-child(4) a img').attr('src', 'images/step-4-active.png');
                PostToRoute();
            }
            else {
                $('.steps ul li:nth-child(4) a img').attr('src', 'images/step-4.png');
                $('.actions ul').removeClass('step-4');
            }
            return true;
        }
    });

    // Custom Button Jquery Steps
    $('.forward').click(function() {
        $("#wizard").steps('next');
      
    })
    $('.backward').click(function() {
        $("#wizard").steps('previous');
    })
    // Click to see password 
    $('.password i').click(function() {
        if ($('.password input').attr('type') === 'password') {
            $(this).next().attr('type', 'text');
        } else {
            $('.password input').attr('type', 'password');
        }
    })
    // Create Steps Image
    $('.steps ul li:first-child').append('<img src="images/step-arrow.png" alt="" class="step-arrow">').find('a').append('<img src="images/step-1-active.png" alt=""> ').append('<span class="step-order">Step 01</span>');
    $('.steps ul li:nth-child(2').append('<img src="images/step-arrow.png" alt="" class="step-arrow">').find('a').append('<img src="images/step-2.png" alt="">').append('<span class="step-order">Step 02</span>');
    $('.steps ul li:nth-child(3)').append('<img src="images/step-arrow.png" alt="" class="step-arrow">').find('a').append('<img src="images/step-3.png" alt="">').append('<span class="step-order">Step 03</span>');
    $('.steps ul li:last-child a').append('<img src="images/step-4.png" alt="">').append('<span class="step-order">Step 04</span>');
    // Count input 

    $('a[href="#finish"]').click(function() {
        //submit.
        $.ajax({
            type: 'POST',
            url: configURL,
            contentType: 'application/json',
            data: JSON.stringify({
                "uID": BotUserID
            }), 
            success: function(response) {
                console.log("Reponse on Submit" + JSON.stringify(response));
                 window.close();
            },error:function(err){
                console.log("Submit call error ",err);
            }
        });
       
    });

    //section 1 updating address::
    $("#UserAddress").change(function() {
        console.log(UserAddress);
        var useraddress = document.getElementById("UserAddress").value;
        let data = {
            "id": "ebc7632feef1a855",
            "UserAddress": useraddress
        }

        if (UserAddress) {
            var call1 = $.ajax({
                type: 'PUT',
                url: 'https://dpd.kore.ai/visualivr?id=ebc7632feef1a855',
                contentType: 'application/json',
                data: JSON.stringify(data), // access in body
                success: function(response) {
                    console.log(JSON.stringify(response));
                }
            });
        }
    });

    //section 2 Get Person details::
    var UserId = "";
    var Username = "";
    $("#patient").change(function() {
        // alert( "Handler for .change() called." );
        $("#text1").css({
            "display": "block"
        });
        $("#text2").css({
            "display": "block"
        });
        $("#text3").css({
            "display": "block"
        });

        var name = document.getElementById("patient").value;

        if (name) {
            $.ajax({
                type: 'GET',
                url: 'https://dpd.kore.ai/visualivr?username=' + name,

                success: function(response) {
                    console.log(JSON.stringify(response));
                    UserId = response[0].id;
                    Username = response[0].username;
                    if (response) {
                        $('#firstname').val(response[0].username)
                        $('#dob').val(response[0].Date)
                    }
                }
            });
        }
    });

    var dataToBeUpdated,amount,phyName, phyAdd,npi,bill;
    //Section 3 Updating details::
    $("#npi").change(function() {
        amount = document.getElementById("amount").value;
        phyName = document.getElementById("phyName").value;
        phyAdd = document.getElementById("phyAdd").value;
        npi = document.getElementById("npi").value;
        bill = document.getElementById("bill").value;

        dataToBeUpdated = {
            "id": UserId,
            "Amount": amount,
            "PhysicianName": phyName,
            "PhysicianAddress": phyAdd,
            "NPI": npi,
            "Bill": bill
        }
        if (amount) {
            $.ajax({
                type: 'PUT',
                url: 'https://dpd.kore.ai/visualivr?username=' + Username,
                contentType: 'application/json',
                data: JSON.stringify(dataToBeUpdated), // access in body
                success: function(response) {
                    console.log("PUT" + JSON.stringify(response));
                }
            });
        }
    });

    //Section 4::
    $("#npi").change(function() {
        OtherDetailsData = JSON.stringify(dataToBeUpdated);
        console.log("OtherDetailsData-", amount,phyName, phyAdd,npi,bill);
        $.ajax({
            type: 'GET',
            url: 'https://dpd.kore.ai/visualivr?username=' + Username,
            success: function(response) {
                //alert(JSON.stringify(response));
                console.log(JSON.stringify(response));
                if (OtherDetailsData) {
                    $('#GetUName').val(response[0].username)
                    $('#GetDOB').val(response[0].Date)
                    $('#GetAddress').val(response[0].UserAddress)
                }
            }
        });
        $('#GetBill').val(bill)
        $('#GetAmount').val(amount)
        $('#GetPhyName').val(phyName)
        $('#GetPhyAdd').val(phyAdd)
        $('#GetNPI').val(npi)
    });

    $(".quantity span").on("click", function() {

        var $button = $(this);
        var oldValue = $button.parent().find("input").val();

        if ($button.hasClass('plus')) {
            var newVal = parseFloat(oldValue) + 1;
        } else {
            // Don't allow decrementing below zero
            if (oldValue > 0) {
                var newVal = parseFloat(oldValue) - 1;
            } else {
                newVal = 0;
            }
        }
        $button.parent().find("input").val(newVal);
    });
})