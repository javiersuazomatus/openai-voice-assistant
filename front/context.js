
const contextOptions = ["home", "purchases", "product", "other"];

//obtiene el contexto en el que se encuentra el usuario, en base a la url de la página actual
function getContext(){

    const currentURL = window.location.href;
    var context;

    switch (currentURL) {
        case currentURL.includes("www.mercadolibre."):
            context = contextOptions[0];
            break;

        case currentURL.includes("my_purchases"):
            context = contextOptions[1];
            break;

        case currentURL.includes("articulo."):
            context = contextOptions[2];
            break;

        default:
            context = contextOptions[3];
            break;
    }

    return context
}