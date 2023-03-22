
//realiza el click en el objeto dado desde el data
function autoClick (data) {

    const target = data.target;

    const element = document.getElementById(target);

    if (element) {
        element.click();
    }
}

//ingresa la búsqueda del item que necesita el usuario en la barra de búsqueda
function inputText (data) {

    const target = data.target;
    const search = data.search;

    const searchBar = document.getElementById(target);

    searchBar.value = search;
    searchBar.form.submit();
}

//en base a la url entregada se redirige al usuario a la sección que necesita
//por ejemplo para ir a mis compras, la url sería: https://myaccount.mercadolibre.cl/my_purchases/list#nav-header
function goTo (data) {

    window.location.href = data.url;
}