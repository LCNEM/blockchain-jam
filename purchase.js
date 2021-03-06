const generalLimit = 270;
const studentLimit = 30;

var isInvalid = true;

$(function () {
    $.get(
        "https://us-central1-blockchainjam.cloudfunctions.net/status"
    ).done((data) => {
        data = JSON.parse(data);
        console.log(data);
        $("#generalPurchased").html(data.general);
        $("#studentPurchased").html(data.student);

        if (data.general >= generalLimit) {
            $("#general").attr("readonly", "true");
        }
        if (data.student >= studentLimit) {
            $("#student").attr("readonly", "true");
        }
    })

    var userAgent = window.navigator.userAgent.toLowerCase();

    if (userAgent.indexOf('msie') != -1 ||
        userAgent.indexOf('trident') != -1) {
    } else if (userAgent.indexOf('edge') != -1) {
        isInvalid = false;
    } else if (userAgent.indexOf('chrome') != -1) {
        isInvalid = false;
    } else if (userAgent.indexOf('safari') != -1) {
    } else if (userAgent.indexOf('firefox') != -1) {
    } else if (userAgent.indexOf('opera') != -1) {
    } else {
    }

    if (!isInvalid) {
        $("#ifPaymentInvalid").addClass("hide");
    } else {
        $("#ccName").attr("required", "true");
        $("#ccNumber").attr("required", "true");
        $("#ccExpMonth").attr("required", "true");
        $("#ccExpYaer").attr("required", "true");
        $("#ccCsc").attr("required", "true");
    }
})

async function purchase() {
    var general = Number($("#general").val());
    var student = Number($("#student").val());

    if(isNaN(general)) {
        general = 0;
    }
    if(isNaN(student)) {
        student = 0;
    }

    if(!general && !student) {
        window.alert("購入数を入力してください。")
        return;
    }

    if (Number($("#generalPurchased").val()) + general > generalLimit) {
        window.alert("定員を超えています。")
        return;
    }

    if (Number($("#studentPurchased").val()) + student > studentLimit) {
        window.alert("定員を超えています。")
        return;
    }

    var price = 9000 * general + 3000 * student;

    var arg, result;

    if (!isInvalid) {
        let supportedInstruments = [{
            supportedMethods: ['basic-card'],
            data: {
                supportedNetworks: [
                    'visa',
                    'mastercard'
                ]
            }
        }];

        let details = {
            displayItems: [
                {
                    label: `一般: 9000x ${general}`,
                    amount: {
                        currency: "JPY",
                        value: (general * 9000).toString()
                    }
                },
                {
                    label: `学生: 3000x ${student}`,
                    amount: {
                        currency: "JPY",
                        value: (student * 3000).toString()
                    }
                }
            ],
            total: {
                label: "合計",
                amount: {
                    currency: "JPY",
                    value: price.toString()
                }
            }
        };

        let request = new PaymentRequest(supportedInstruments, details, { requestShipping: false });

        result = await request.show();
        if (!result) {
            return;
        }

        arg = {
            number: result.details.cardNumber,
            cvc: result.details.cardSecurityCode,
            exp_month: result.details.expiryMonth,
            exp_year: result.details.expiryYear
        }; console.log(arg)
    } else {
        if (!window.confirm(`購入しますか？合計${price}円\n(購入処理中にホダンを連打されますと二重支払いが起こる可能性があるため、OKを押したらしばらくお待ちください)`)) {
            return;
        }


        arg = {
            number: $("#ccNumber").val(),
            cvc: $("#ccCsc").val(),
            exp_month: $("#ccExpMonth").val(),
            exp_year: $("#ccExpYear").val()
        };
    }
    $("#cover").addClass("show");

    var name = $("#name").val();
    var email = $("#email").val();

    var publicKey = "pk_live_5fc18abd168786daccb895b2"/*"pk_test_9bd57d50c30ed9d2ec978af1"*/;
    Payjp.setPublicKey(publicKey);
    Payjp.createToken(arg, (status, response) => {
        if (status == 200) {
            $.post(
                "https://us-central1-blockchainjam.cloudfunctions.net/purchase",
                {
                    name: name,
                    email: email,
                    general: general,
                    student: student,
                    token: response.id
                }
            ).done(() => {
                if (result) {
                    result.complete("success");
                }
                location.href = "purchase-completed.html";
            }).fail((data, status, jqXHR) => {
                if (result) {
                    result.complete("fail");
                } else {
                    window.alert("エラーが発生しました。" + JSON.stringify(data))
                }
                $("#cover").removeClass("show");
            })
        } else {
            if (result) {
                result.complete("fail");
            } else {
                window.alert("エラーが発生しました。クレジットカードのトークンを取得できませんでした。")
            }
            $("#cover").removeClass("show");
        }
    });
}
