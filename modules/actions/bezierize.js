

/* Generate a bezier curve from points (minimum 3 points) */
export function actionBezierize(nodeIDs, projection) {


    var action = function(graph, t) {
        var nodes = nodeIDs.map(function(id) { return graph.entity(id); });
        var controlPoints = nodes.map(function(n) { return projection(n.loc); });
        console.log('controlPoints', controlPoints);


        /*for (f = 0; f <= 1.01; f += .01 ) {
            bezier(controlPoints.length, f);
            //pathData.push([xsum,ysum]);
        }*/

        return graph;
    };

    var binomial = function(n, k) {
        if ((typeof n !== 'number') || (typeof k !== 'number')) 

        return false; 
        var coeff = 1;

        for (var x = n-k+1; x <= n; x++) coeff *= x;
        for (x = 1; x <= k; x++) coeff /= x;
        return coeff;
    }	


    var bezier = function(xPrev, yPrev, n, m) {
    
        var z = n 
            n = n - 1

        for(k = 0; k < z; k++) {

            //if (k==n){h=k;}
            //else {h=k+1;} 

            //coeff = binomial(z-1, k);

            //xsum += +xCoords[k]*coeff* Math.pow((1-m),(n-k))*Math.pow(m,k)
           // ysum += +yCoords[k]*coeff* Math.pow((1-m),(n-k))*Math.pow(m,k)
        }
    };


    action.disabled = function(graph) {
        if (nodeIDs.length !== 3)
            return 'needs_3_points';
        return false;
    };


    action.transitionable = true;


    return action;
}