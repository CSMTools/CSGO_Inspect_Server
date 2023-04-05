import config from "../../../../config.js";
export default function inspect(fastify, botMaster) {
    if (config.enable_bulk_requests) {
        fastify.get('/inspect/bulk', async function (request, reply) {
            if (config.bulk_key && !request.query.key) {
                return reply.send({
                    error: "No key provided."
                });
            }
            if (request.query.links) {
                let links = request.query.links.split(',');
                if (links.length > config.max_bulk_amount) {
                    return reply.send({
                        error: "Max link amount exceeded."
                    });
                }
                reply.send(await botMaster.inspectItemBulk(links));
            }
            else {
                reply.send({});
            }
        });
    }
}
